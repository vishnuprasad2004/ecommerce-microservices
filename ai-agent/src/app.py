# from kubernetes import client, config
# from langchain.agents import create_agent
# from langchain.tools import tool
# from langchain.chat_models import init_chat_model
# import dotenv

# dotenv.load_dotenv()  # Load environment variables from .env file

# @tool("get_pod_logs", description="Get logs from a specific pod in a given namespace.")
# def get_pod_logs(pod_name: str, namespace: str):
#     """
#     Get logs from a specific pod in a given namespace.

#     Args:
#         pod_name (str): The name of the pod to retrieve logs from.
#         namespace (str): The namespace where the pod is located.

#     Returns:
#         str: The logs from the specified pod.
#     """
#     # Load Kubernetes configuration
#     config.load_kube_config()
    
#     # Create an API client
#     v1 = client.CoreV1Api()
    
#     try:
#         # Retrieve logs from the specified pod
#         logs = v1.read_namespaced_pod_log(name=pod_name, namespace=namespace)
#         return logs
#     except client.exceptions.ApiException as e:
#         return f"An error occurred while retrieving logs: {e}"

# # Initialize the model with the correct provider
# model = init_chat_model("openai/gpt-oss-120b:free", model_provider="openrouter")

# agent = create_agent(
#     model=model,
#     tools=[get_pod_logs],
    
#     system_prompt="""You are a helpful assistant that can interact with Kubernetes clusters. You can perform various operations such as creating, updating, and deleting resources, as well as retrieving information about the cluster. Always ensure to follow best practices and provide accurate information. If you are unsure about a command or its consequences, ask for clarification before proceeding. Always confirm with the user before executing any command that may have significant consequences.""",
# )

# for chunk in agent.stream("Get logs from the pod named 'my-pod' in the 'default' namespace."):
#     print(chunk, end="", flush=True)

from kubernetes import client, config
from langchain_openrouter import ChatOpenRouter
from langchain.agents import create_agent
from langchain_core.tools import tool
import dotenv

dotenv.load_dotenv()

@tool("get_pods", description="Get a list of all pods in a given namespace.")
def get_pods(namespace:str="default"):
	"""
	Get a list of all pods in a given namespace.

	Args:
		namespace (str): The namespace to retrieve pods from.

	Returns:
		str: A list of pod names in the specified namespace.
	"""
	config.load_kube_config()
	v1 = client.CoreV1Api()
	
	try:
		pods = v1.list_namespaced_pod(namespace=namespace)
		pod_names = [pod.metadata.name for pod in pods.items]
		return f"Pods in namespace '{namespace}': {', '.join(pod_names)}"
	except Exception as e:
		return f"An error occurred while retrieving pods: {e}"



@tool("get_pod_logs", description="Get logs from a specific pod in a given namespace.")
def get_pod_logs(pod_name: str, namespace: str):
    """
    Get logs from a specific pod in a given namespace.

    Args:
        pod_name (str): The name of the pod to retrieve logs from.
        namespace (str): The namespace where the pod is located.
    """
    config.load_kube_config()
    v1 = client.CoreV1Api()
    
    try:
        logs = v1.read_namespaced_pod_log(name=pod_name, namespace=namespace)
        return logs
    except Exception as e:
        return f"An error occurred while retrieving logs: {e}"

# 1. Use the dedicated OpenRouter class
model = ChatOpenRouter(
    model="openai/gpt-oss-120b:free",
    # OPENROUTER_API_KEY is automatically picked up from .env
)

# 2. Use create_react_agent (replaces the older create_agent)
agent = create_agent(
    model=model,
    tools=[get_pod_logs, get_pods],
    system_prompt="You are a helpful assistant that can interact with Kubernetes clusters."
)

# 3. FIX: Pass a dictionary with a "messages" key
inputs = {"messages": [("user", "Get logs from the pod named product-service in the 'default' namespace.")]}

# Stream the output
for chunk in agent.stream(inputs, stream_mode="values"):
    # Print the most recent message in the state
    latest_message = chunk["messages"][-1]
    latest_message.pretty_print()