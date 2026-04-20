"""
Kubernetes Tools for SRE Agent

Provides clean interface to Kubernetes API for:
- Pod status and info
- Logs retrieval
- Events tracking
- Resource usage
- Deployment configuration
- Service endpoints
"""

from kubernetes import client, config
from kubernetes.client.rest import ApiException
from typing import Dict, List, Optional
import json


class K8sTools:
    """Wrapper for Kubernetes API operations"""
    
    def __init__(self, kubeconfig_path: Optional[str] = None):
        """
        Initialize K8s client
        
        Args:
            kubeconfig_path: Path to kubeconfig file (None = use default)
        """
        try:
            if kubeconfig_path:
                config.load_kube_config(config_file=kubeconfig_path)
            else:
                # Try in-cluster config first (for production)
                try:
                    config.load_incluster_config()
                except config.ConfigException:
                    # Fall back to kubeconfig (for development)
                    config.load_kube_config()
            
            self.core_v1 = client.CoreV1Api()
            self.apps_v1 = client.AppsV1Api()
            self.custom_api = client.CustomObjectsApi()
            
        except Exception as e:
            raise Exception(f"Failed to initialize K8s client: {e}")
    
    def get_pod_status(self, namespace: str, pod_name: Optional[str] = None) -> Dict:
        """
        Get current status of pods
        
        Args:
            namespace: K8s namespace
            pod_name: Specific pod name (optional)
        
        Returns:
            Dict with pod status info or list of pods
        """
        try:
            if pod_name:
                pod = self.core_v1.read_namespaced_pod(pod_name, namespace)
                
                # Get container statuses
                container_statuses = []
                if pod.status.container_statuses:
                    for cs in pod.status.container_statuses:
                        container_statuses.append({
                            "name": cs.name,
                            "ready": cs.ready,
                            "restart_count": cs.restart_count,
                            "state": self._get_container_state(cs.state)
                        })
                
                return {
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "status": pod.status.phase,
                    "node": pod.spec.node_name,
                    "containers": container_statuses,
                    "restart_count": sum(cs.restart_count for cs in pod.status.container_statuses) if pod.status.container_statuses else 0,
                    "created": str(pod.metadata.creation_timestamp)
                }
            else:
                # List all pods in namespace
                pods = self.core_v1.list_namespaced_pod(namespace)
                return {
                    "pods": [
                        {
                            "name": p.metadata.name,
                            "status": p.status.phase,
                            "ready": self._is_pod_ready(p),
                            "restarts": sum(cs.restart_count for cs in p.status.container_statuses) if p.status.container_statuses else 0
                        }
                        for p in pods.items
                    ],
                    "total": len(pods.items)
                }
        
        except ApiException as e:
            return {"error": f"K8s API error: {e.status} - {e.reason}"}
        except Exception as e:
            return {"error": str(e)}
    
    def get_pod_logs(
        self, 
        namespace: str, 
        pod_name: str, 
        tail_lines: int = 100,
        container_name: Optional[str] = None
    ) -> str:
        """
        Fetch recent logs from a pod
        
        Args:
            namespace: K8s namespace
            pod_name: Pod name
            tail_lines: Number of recent lines (default 100)
            container_name: Specific container (for multi-container pods)
        
        Returns:
            Log content as string
        """
        try:
            kwargs = {
                "name": pod_name,
                "namespace": namespace,
                "tail_lines": min(tail_lines, 500)  # Cap at 500 lines
            }
            
            if container_name:
                kwargs["container"] = container_name
            
            logs = self.core_v1.read_namespaced_pod_log(**kwargs)
            return logs
        
        except ApiException as e:
            return f"Error fetching logs: {e.status} - {e.reason}"
        except Exception as e:
            return f"Error: {str(e)}"
    
    def get_pod_events(self, namespace: str, pod_name: str) -> List[Dict]:
        """
        Get Kubernetes events for a pod
        
        Args:
            namespace: K8s namespace
            pod_name: Pod name
        
        Returns:
            List of events sorted by time (most recent first)
        """
        try:
            events = self.core_v1.list_namespaced_event(namespace)
            
            pod_events = []
            for event in events.items:
                if event.involved_object.name == pod_name:
                    pod_events.append({
                        "time": str(event.last_timestamp or event.first_timestamp),
                        "type": event.type,
                        "reason": event.reason,
                        "message": event.message,
                        "count": event.count or 1
                    })
            
            # Sort by time, most recent first
            pod_events.sort(key=lambda x: x['time'], reverse=True)
            
            return pod_events[:20]  # Return last 20 events
        
        except ApiException as e:
            return [{"error": f"K8s API error: {e.status} - {e.reason}"}]
        except Exception as e:
            return [{"error": str(e)}]
    
    def get_resource_usage(self, namespace: str, pod_name: str) -> Dict:
        """
        Get current CPU and memory usage
        
        Requires metrics-server to be installed in cluster
        
        Args:
            namespace: K8s namespace
            pod_name: Pod name
        
        Returns:
            Dict with CPU and memory usage
        """
        try:
            metrics = self.custom_api.get_namespaced_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                namespace=namespace,
                plural="pods",
                name=pod_name
            )
            
            containers_usage = []
            for container in metrics.get('containers', []):
                containers_usage.append({
                    "name": container['name'],
                    "cpu": container['usage']['cpu'],
                    "memory": container['usage']['memory']
                })
            
            return {
                "pod_name": pod_name,
                "timestamp": metrics.get('timestamp'),
                "containers": containers_usage
            }
        
        except ApiException as e:
            if e.status == 404:
                return {"error": "Metrics not available. Is metrics-server installed?"}
            return {"error": f"K8s API error: {e.status} - {e.reason}"}
        except Exception as e:
            return {"error": str(e)}
    
    def get_deployment_config(self, namespace: str, deployment_name: str) -> Dict:
        """
        Get deployment configuration
        
        Args:
            namespace: K8s namespace
            deployment_name: Deployment name
        
        Returns:
            Dict with deployment config
        """
        try:
            deployment = self.apps_v1.read_namespaced_deployment(deployment_name, namespace)
            
            container = deployment.spec.template.spec.containers[0]
            
            return {
                "name": deployment.metadata.name,
                "namespace": deployment.metadata.namespace,
                "replicas": {
                    "desired": deployment.spec.replicas,
                    "available": deployment.status.available_replicas or 0,
                    "ready": deployment.status.ready_replicas or 0
                },
                "image": container.image,
                "resources": {
                    "requests": self._parse_resources(container.resources.requests) if container.resources and container.resources.requests else None,
                    "limits": self._parse_resources(container.resources.limits) if container.resources and container.resources.limits else None
                },
                "env_vars": [{"name": e.name, "value": e.value or "[from secret/configmap]"} for e in (container.env or [])],
                "strategy": deployment.spec.strategy.type
            }
        
        except ApiException as e:
            return {"error": f"K8s API error: {e.status} - {e.reason}"}
        except Exception as e:
            return {"error": str(e)}
    
    def get_service_endpoints(self, namespace: str, service_name: str) -> Dict:
        """
        Get service endpoints (which pods are backing the service)
        
        Args:
            namespace: K8s namespace
            service_name: Service name
        
        Returns:
            Dict with service and endpoint info
        """
        try:
            service = self.core_v1.read_namespaced_service(service_name, namespace)
            endpoints = self.core_v1.read_namespaced_endpoints(service_name, namespace)
            
            ready_addresses = []
            not_ready_addresses = []
            
            if endpoints.subsets:
                for subset in endpoints.subsets:
                    if subset.addresses:
                        ready_addresses.extend([
                            {
                                "ip": addr.ip,
                                "pod": addr.target_ref.name if addr.target_ref else None
                            }
                            for addr in subset.addresses
                        ])
                    if subset.not_ready_addresses:
                        not_ready_addresses.extend([
                            {
                                "ip": addr.ip,
                                "pod": addr.target_ref.name if addr.target_ref else None
                            }
                            for addr in subset.not_ready_addresses
                        ])
            
            return {
                "service_name": service_name,
                "type": service.spec.type,
                "cluster_ip": service.spec.cluster_ip,
                "ports": [{"port": p.port, "target_port": str(p.target_port)} for p in service.spec.ports],
                "ready_endpoints": ready_addresses,
                "not_ready_endpoints": not_ready_addresses,
                "total_endpoints": len(ready_addresses) + len(not_ready_addresses)
            }
        
        except ApiException as e:
            return {"error": f"K8s API error: {e.status} - {e.reason}"}
        except Exception as e:
            return {"error": str(e)}
    
    # Helper methods
    
    def _get_container_state(self, state) -> str:
        """Parse container state object"""
        if state.running:
            return "running"
        elif state.waiting:
            return f"waiting: {state.waiting.reason}"
        elif state.terminated:
            return f"terminated: {state.terminated.reason}"
        return "unknown"
    
    def _is_pod_ready(self, pod) -> bool:
        """Check if pod is ready"""
        if not pod.status.conditions:
            return False
        for condition in pod.status.conditions:
            if condition.type == "Ready":
                return condition.status == "True"
        return False
    
    def _parse_resources(self, resources) -> Dict:
        """Parse resource dict to readable format"""
        if not resources:
            return None
        return {k: v for k, v in resources.items()}