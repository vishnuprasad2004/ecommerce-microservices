# user-service


* In user-service, PostgreSQL is used as a suitable DB beacause of its relational nature. An SQL type DB is good for relations, joins and transactional processes.
* Implmented Soft-deleting, i.e. a technique where records are not permanently removed from the database but are instead marked as deleted, typically using a flag like `isDeleted`. It helps in Data Recovery, Auditing, Historial Analysis. I used a isDeleted flag for each user.

<img src="https://mermaid.ink/img/pako:eNp9UtluwjAQ_BVrnwEBuf1GS5BQy1EgUlVFiiy8gFViIyfpRfn3OhBoaNU-2TPjsWd3vYel4ggUUPcFW2uWxpKQ2eQ-nJN9uSVkOF4Qwcn07gQX4eOCaLXFRLIUSUkeYlku0TycXVxRNOz_spWOGsSUiS2JxsOHKKzRO5Zlr0rzOrVREq9O3kxMxt74dEfyglqsBPJrTWQJxy3mZ76spExOBudQw1E4X_RGU7LUyMy5hOU_lWLHa0pVaq_fn4XzP4s94iJDnRhyUO9AlmvEvEYsRf5-pZvHavhD7JJyQv_nrVKdxvb52WyqfTUNSkwzxVpm3wOq9HMJlGyYUaEBay040FwX2IAUtWmsgXAsMYZ8g2Z2QM2WM_0cQywPxrNj8kmp9GzTqlhvgK7YNjPo1LrqX11YjZKjvlWFzIF2g-MdQPfwBtSyuy2va1tty3GtwPW9BryXbMsPHLcTBK7nOx3bdg4N-Di-2m4Fvu15vud2fNfy2r5z-AItKdlv?type=png" height="700"/>

## Get Started

Follow these steps to set up and run the User-Service:

1. **Clone the Repository**  
  Clone the repository to your local machine using the following command:  
  ```bash
  git clone https://github.com/vishnuprasad2004/ecommerce-microservices.git
  ```

2. **Set Up Environment Variables**  
  Create a `.env` file in the root directory of the `user-service` folder. Use the `.env.example` file as a reference to define all the required environment variables, such as the MongoDB connection string, AWS keys, and other configurations.

3. **Build the Docker Image**  
  Build the Docker image for the User-Service using the following command:  
  ```bash
  docker build -t user-service:latest .
  ```

4. **Run the Docker Container**  
  Start the User-Service by running the Docker container with the following command:  
  ```bash
  docker run -p 3002:3002 --env-file .env user-service
  ```

5. **Access the Service**  
  Once the container is running, the User-Service will be accessible at `http://localhost:3002`.

6. **Verify the Setup**  
  Test the endpoints using tools like Postman or cURL to ensure the service is running correctly.

---


## Kubernetes Commands used (for local prod)
> Prerequisites: Docker and minikube should be installed and kubectl should be configured
> Run `minikube status` to check the config status

1. First run this command to load the local image into minikube cluster's container runtime, so minikube knows not to pull it from a remote registry. 

```bash
minikube image load user-service:latest
```

2. Let's make ConfigMap file automatically from our .env file to store configuration and environment variables.

```bash
kubectl create configmap user-service-env --from-env-file=.env
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

> **To scale a Deployment** by updating the number of Pods in a deployment, run ```kubectl scale deployment/user-service --replicas=10```

> **To Check the Logs:** we can use the command and can start debugging ```kubectl logs <pod-name>```

> **To execute in the Pod:** We can use the command ```kubectl exec -it user-service-67d5875c99-khkvq -- sh```

|NAME                             |  READY |   STATUS  | RESTARTS |  AGE |
|---------------------------------|--------|-----------|----------|------|
|user-service-67d5875c99-khkvq |  1/1   |  Running  |    0     | 80m  |

## Future Improvements (Auth)
- [ ] Email verification
- [ ] Password reset flow
- [ ] Refresh token rotation
- [ ] Role-based access control (RBAC)
- [ ] Session management

## Routes to be implemented for future
- POST /auth/login - User login
- POST /auth/logout - User logout
- POST /auth/refresh - Refresh access token
- POST /auth/verify-email/:token - Verify email
- POST /auth/forgot-password - Request password reset
- POST /auth/reset-password/:token - Reset password