# API Gateway

The API Gateway is the single entry point for all client requests in this microservices architecture. It handles routing, rate limiting, security headers, and request logging before forwarding traffic to the appropriate downstream service.

---

## Architecture

```
Client
  │
  ▼
API Gateway (NodePort :30000)
  ├── /api/users    → user-service:3002
  ├── /api/products → product-service:3001
  └── /api/orders   → order-service:3003
```

All downstream services are `ClusterIP` — unreachable from outside the cluster. Only the gateway is exposed.

---

## Tech Stack

- **Runtime**: Node.js 18 + TypeScript
- **Framework**: Express
- **Proxy**: `http-proxy-middleware` v3
- **Security**: `helmet`, `express-rate-limit`
- **Logging**: `morgan`

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- Docker Desktop
- Minikube
- kubectl

### 1. Install dependencies

```bash
cd api-gateway
npm install
```

### 2. Set up environment variables

Create a `.env` file in the `api-gateway` directory:

```env
PORT=3000
PRODUCT_SERVICE_URL=http://product-service:3001
USER_SERVICE_URL=http://user-service:3002
ORDER_SERVICE_URL=http://order-service:3003
```

### 3. Build TypeScript

```bash
npm run build
```

### 4. Run locally (without Kubernetes)

```bash
npm run start
```

Gateway will be available at `http://localhost:3000`.

---

## Kubernetes Deployment (Minikube)

### Prerequisites

- Minikube running: `minikube start`
- All other services already deployed (user-service, product-service, order-service)

### Step 1 — Point Docker CLI to Minikube's daemon

This must be done in every new terminal session before building:

```bash
eval $(minikube docker-env)
```

You'll know it's working when `docker images` shows Kubernetes system images like `registry.k8s.io/pause`.

### Step 2 — Build the image inside Minikube

```bash
docker build -t api-gateway:latest .
```

> **Note:** `imagePullPolicy: Never` is set in the deployment, so the image must exist inside Minikube's Docker — not your laptop's. If you skip `eval $(minikube docker-env)`, the pod will fail to start.

### Step 3 — Create the ConfigMap from your .env

```bash
kubectl create configmap api-gateway-env --from-env-file=.env
```

### Step 4 — Apply Kubernetes manifests

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### Step 5 — Verify deployment

```bash
kubectl rollout status deployment/api-gateway
kubectl get pods
kubectl get svc api-gateway
```

### Step 6 — Access the gateway

```bash
minikube service api-gateway --url
```

This prints a `http://127.0.0.1:<port>` URL. Use this in Postman or your browser. Keep the terminal open — it acts as a tunnel.

> **Windows users:** `http://$(minikube ip):30000` does not work on Windows. Always use `minikube service api-gateway --url` instead.

---

## Kubernetes Manifests

### `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: api-gateway:latest
        imagePullPolicy: Never
        envFrom:
        - configMapRef:
            name: api-gateway-env
        ports:
        - containerPort: 3000
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
          requests:
            memory: "64Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 10
          timeoutSeconds: 2
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 2
          failureThreshold: 3
```

### `k8s/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  type: NodePort
  selector:
    app: api-gateway
  ports:
  - port: 3000
    targetPort: 3000
    nodePort: 30000
```

> `NodePort` is used for local Minikube access. In production, replace with `ClusterIP` and use an Ingress or cloud LoadBalancer instead.

---

## Updating the Gateway

After making code changes, rebuild and redeploy in one go:

```bash
eval $(minikube docker-env)
docker build --no-cache -t api-gateway:latest .
kubectl rollout restart deployment/api-gateway
kubectl rollout status deployment/api-gateway
```

Then get the new URL:

```bash
minikube service api-gateway --url
```

---

## Available Endpoints

| Method | Path | Forwards To |
|--------|------|-------------|
| GET | `/health` | Gateway itself (no proxy) |
| ANY | `/api/users/*` | user-service:3002 |
| ANY | `/api/products/*` | product-service:3001 |
| ANY | `/api/orders/*` | order-service:3003 |

---

## Debugging

### Check pod logs
```bash
kubectl logs -l app=api-gateway -f
```

### Check if a downstream service is reachable from inside the gateway pod
```bash
kubectl exec -it $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}') \
  -- wget -qO- http://order-service:3003/health
```

### Verify what code is actually running in the container
```bash
kubectl exec -it $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}') \
  -- cat dist/index.js | grep pathFilter
```

---

## Notes — Lessons Learned

These are real issues encountered during local development and debugging that are worth knowing upfront.

**`EXPOSE` in Dockerfile is just documentation.** It doesn't open any ports or affect how Kubernetes routes traffic. What matters is `targetPort` in your Service matching the port your app actually calls `app.listen()` on.

**`eval $(minikube docker-env)` must be run in every new terminal session.** Without it, `docker build` targets your laptop's Docker daemon, not Minikube's. The pod will fail silently because it can't find the image even though it exists locally.

**On Windows, `minikube ip` doesn't work for browser/Postman access.** The IP `192.168.49.2` lives inside a Linux VM that Windows can't route to. Always use `minikube service api-gateway --url` which gives a `127.0.0.1` tunnel URL instead.

**`http-proxy-middleware` v3 with `app.use('/api/orders', ...)` strips the path prefix.** When Express matches a route prefix, it strips it from `req.url` before passing to the middleware. So the proxy was forwarding `/` instead of `/api/orders`, causing `Cannot GET /` from downstream services. The fix is to mount the proxy at root using `pathFilter` instead of mounting at the path directly.

**Docker layer caching can hide code changes.** If `COPY . .` is cached, your source changes never make it into the image. Use `docker build --no-cache` when you're not sure if the latest code is being picked up.
