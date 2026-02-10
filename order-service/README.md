# Order-Service

* In order-service, PostgreSQL is used as a suitable DB beacause of its relational nature. An SQL type DB is good for relations, joins and transactional processes. I used drizzle as the ORM (Object Relational Mapping)
* Implemented Service-to-Service Communication with user-service and product-service along with 

<img src="https://mermaid.ink/img/pako:eNp9UtluwjAQ_BVrnwEBuf1GS5BQy1EgUlVFiiy8gFViIyfpRfn3OhBoaNU-2TPjsWd3vYel4ggUUPcFW2uWxpKQ2eQ-nJN9uSVkOF4Qwcn07gQX4eOCaLXFRLIUSUkeYlku0TycXVxRNOz_spWOGsSUiS2JxsOHKKzRO5Zlr0rzOrVREq9O3kxMxt74dEfyglqsBPJrTWQJxy3mZ76spExOBudQw1E4X_RGU7LUyMy5hOU_lWLHa0pVaq_fn4XzP4s94iJDnRhyUO9AlmvEvEYsRf5-pZvHavhD7JJyQv_nrVKdxvb52WyqfTUNSkwzxVpm3wOq9HMJlGyYUaEBay040FwX2IAUtWmsgXAsMYZ8g2Z2QM2WM_0cQywPxrNj8kmp9GzTqlhvgK7YNjPo1LrqX11YjZKjvlWFzIF2g-MdQPfwBtSyuy2va1tty3GtwPW9BryXbMsPHLcTBK7nOx3bdg4N-Di-2m4Fvu15vud2fNfy2r5z-AItKdlv?type=png" height="700"/>



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
  docker run -p 3003:3003 --env-file .env user-service
  ```

5. **Access the Service**  
  Once the container is running, the User-Service will be accessible at `http://localhost:3003`.

6. **Verify the Setup**  
  Test the endpoints using tools like Postman or cURL to ensure the service is running correctly.

---