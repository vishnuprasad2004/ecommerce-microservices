# Product-Service

* In the Product-Service, MongoDB was chosen as the database due to its suitability for scenarios with a high View-to-Update ratio (approximately 3%), indicating significantly more read operations compared to write operations. As a document-oriented database, MongoDB offers optimized performance for read-heavy workloads, making it a more efficient choice compared to relational databases in this context.
* Implmented Soft-deleting, i.e. a technique where records are not permanently removed from the database but are instead marked as deleted, typically using a flag like `isDeleted`. It helps in Data Recovery, Auditing, Historial Analysis. I used a isDeleted flag for each product.


## Get Started

Follow these steps to set up and run the Product-Service:

1. **Clone the Repository**  
  Clone the repository to your local machine using the following command:  
  ```bash
  git clone https://github.com/vishnuprasad2004/ecommerce-microservices.git
  ```

2. **Set Up Environment Variables**  
  Create a `.env` file in the root directory of the `product-service` folder. Use the `.env.example` file as a reference to define all the required environment variables, such as the MongoDB connection string, AWS keys, and other configurations.

3. **Build the Docker Image**  
  Build the Docker image for the Product-Service using the following command:  
  ```bash
  docker build -t product-service .
  ```

4. **Run the Docker Container**  
  Start the Product-Service by running the Docker container with the following command:  
  ```bash
  docker run -p 3001:3001 --env-file .env product-service
  ```

5. **Access the Service**  
  Once the container is running, the Product-Service will be accessible at `http://localhost:3001`.

6. **Verify the Setup**  
  Test the endpoints using tools like Postman or cURL to ensure the service is running correctly.

---


### All Product Retrieval Action Analysis:
* Time Taken: 2.87 s

| **Metric**         | **Size**     |
|--------------------|--------------|
| Response Size      | 3.36 KB      |
| Headers            | 238 B        |
| Body               | 3.12 KB      |
| **Request Size**   | **213 B**    |
| Headers            | 213 B        |
| Body               | 0 B          |

Example Response: 
  ```json
  {
      "message": "Get all current available products",
      "data": [
        {}, {}, {}
      ],
      "pagination": {
          "currentPage": 1,
          "pageSize": 10,
          "totalItems": 3,
          "totalPages": 1
      },
      "status": "success"
  }
```



### Product Insertion Anaylsis: 

* Time Taken: 13.27 s


| **Metric**         | **Size**     |
|--------------------|--------------|
| Response Size      | 1.35 KB      |
| Headers            | 243 B        |
| Body               | 1.11 KB      |
| **Request Size**   | **170.77 KB**|
| Headers            | 238 B        |
| Body               | 170.54 KB    |


Example Response :
```json
  {
      "message": "Product created successfully",
      "product": {
          "productId": "...",
          "productName": "...",
          "productSKU": "VGR-COL-ELE",
          "productPrice": 619,
          "productWeight": 0.6,
          "productImage": "...",
          "productShortDescription": "...",
          "productLongDescription": "...",
          "productCategory": "...",
          "productStock": 0,
          "isDeleted": false,
          "_id": "69591222752d42775ea79fc9",
          "createdAt": "2026-01-03T12:57:06.963Z",
          "updatedAt": "2026-01-03T12:57:06.963Z",
          "__v": 0
      },
      "status": "success"
  }
  ```
  

## Kubernetes Commands used (for local prod)
> Prerequisites: Docker and minikube should be installed and kubectl should be configured
> Run `minikube status` to check the config status

1. First run this command to load the local image into minikube cluster's container runtime, so minikube knows not to pull it from a remote registry. 

```bash
minikube image load product-service:latest
```

2. Let's make ConfigMap file automatically from our .env file to store configuration and environment variables.

```bash
kubectl create configmap product-service-env --from-env-file=.env
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

> **To scale a Deployment** by updating the number of Pods in a deployment, run ```kubectl scale deployment/product-service --replicas=10```



|NAME                             |  READY |   STATUS  | RESTARTS |  AGE |
|---------------------------------|--------|-----------|----------|------|
|product-service-75449bbfc6-k7xhn |  1/1   |  Running  |    0     | 80m  |