# Order-Service

* In order-service, PostgreSQL is used as a suitable DB beacause of its relational nature. An SQL type DB is good for relations, joins and transactional processes. I used drizzle as the ORM (Object Relational Mapping)
* Implemented Service-to-Service Communication with order-service and product-service along with 

<img src="https://mermaid.ink/img/pako:eNqNU2tPgzAU_SvN_TwXNsZjfFOHCdE9MlliDAlpaN0aR4ulJO713y2w6UBM7Lfec8-59_bcHiARhIIHVE4YXkucRhzpM19O_GX8HN6Gq2d0qGPlCWYhYgQtHn9Cof8SolxhVeQxxymtkVPEr5QaGqtVMGmLVLEipzJmpFlNSKKjtT56uKLMVlN_GdyfEzLJEtpqqkYwIZLmeSeWMLXrBMp63XKJKLiS3aw9y1rxbCN4tw5NMdt2jarw5xUhmPrahekCJZLqlkiMVRdaZOQXejefP_m3M8TymNAt1XCXNXEQ-tP_-VP3p5GHNpJJQYpENcy7-PNRYK4a73xBmKLpL-P-HLjV9nk3j8ebG3G4bJmHItjgPILG7l3nnMctExPBFWa8yoYerCUj4ClZ0B6kVGp79BWqd4lAbajebChpBMv3knLSnAzzVyHSC02KYr0B7w1vc32rPTl_q-8UyvUj3pdLBJ5VKYB3gE_wzPGg7wxHpmHZ5sh2LbMHO_AGw747tuyBYRmWNXSGtnvqwb6qafTH7shxXMceuLbpGK51-gKfqxnP?type=png" height="500"/>



## Get Started

Follow these steps to set up and run the Order-Service:

1. **Clone the Repository**  
  Clone the repository to your local machine using the following command:  
  ```bash
  git clone https://github.com/vishnuprasad2004/ecommerce-microservices.git
  ```

2. **Set Up Environment Variables**  
  Create a `.env` file in the root directory of the `order-service` folder. Use the `.env.example` file as a reference to define all the required environment variables, such as the PostgreSQL connection string, & other configurations.

3. **Build the Docker Image**  
  Build the Docker image for the Order-Service using the following command:  
  ```bash
  docker build -t order-service:latest .
  ```

4. **Run the Docker Container**  
  Start the Order-Service by running the Docker container with the following command:  
  ```bash
  docker run -p 3003:3003 --env-file .env order-service
  ```

5. **Access the Service**  
  Once the container is running, the order-Service will be accessible at `http://localhost:3003`.

6. **Verify the Setup**  
  Test the endpoints using tools like Postman or cURL to ensure the service is running correctly.

---

## Kubernetes Commands used (for local prod)
> Prerequisites: Docker and minikube should be installed and kubectl should be configured
> Run `minikube status` to check the config status

1. First run this command to load the local image into minikube cluster's container runtime, so minikube knows not to pull it from a remote registry. 

```bash
minikube image load order-service:latest
```

2. Let's make ConfigMap file automatically from our .env file to store configuration and environment variables.

```bash
kubectl create configmap order-service-env --from-env-file=.env
```

3. Now, create/update the resources like Pods, Services, Deployment using the kubectl apply command 

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

4. Check the status of all the pods through this command ```kubectl get pods``` and get detailed config and events of each pod in deployment through ```kubectl get pod <pod-name>```

5. Check out the dashboard 🎉, run 
```bash
minikube dashboard 
```
Or you can check it out on Lens IDE

> **To scale a Deployment** by updating the number of Pods in a deployment, run ```kubectl scale deployment/order-service --replicas=10```

> **To Check the Logs:** we can use the command and can start debugging ```kubectl logs <pod-name>```

> **To execute in the Pod:** We can use the command ```kubectl exec -it order-service-67d5875c99-khkvq -- sh```

|NAME                             |  READY |   STATUS  | RESTARTS |  AGE |
|---------------------------------|--------|-----------|----------|------|
|order-service-67d5875c99-dcshdq  |  1/1   |  Running  |    0     | 90m  |

Internally, the Service URL for this module will be: http://order-service:3003 

## Kubernetes Operations with Lens IDE

Alternatively, you can use **Lens IDE** to perform all the above Kubernetes operations through a user-friendly graphical interface. Lens provides features like pod management, log viewing, resource monitoring, scaling deployments, and executing commands in containers without using the command line.
