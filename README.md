# E-commerce Microservices with Kubernetes - v1

> Designed and deployed a containerized microservices-based e-commerce backend with independent scaling, service isolation, and Kubernetes orchestration to simulate production-grade distributed systems.

I made this project to understand how scalable and large-scale software systems are designed, deployed, scaled, and managed in real-world environments. Instead of building a monolithic application, this project follows a microservices architecture similar to what is used in production-grade e-commerce platforms.

The application is split into independent services such as **User Service, Product Service, Order Service**, and supporting infrastructure components. Each service is developed, containerized, and deployed independently locally using **minikube**, allowing the system to scale specific services based on demand rather than scaling the entire application.

## Tech Stack:
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) 
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/kubernetes-%23326ce5.svg?style=for-the-badge&logo=kubernetes&logoColor=white)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-%23000000?style=for-the-badge&logo=drizzle&logoColor=C5F74F)

## Folder Structure

```
ecommerce-microservices/
│
├── amazon-data.json
├── README.md
│
├── api-gateway/
│   ├── src/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── compose.yaml
│   └── package.json
│
├── user-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── schema.ts
│   │   ├── db.ts
│   │   └── index.ts
│   ├── Dockerfile
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── compose.yaml
│   └── package.json
│
├── product-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── db.ts
│   │   └── index.ts
│   ├── Dockerfile
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── compose.yaml
│   └── package.json
│
└── order-service/
    ├── src/
    │   ├── controllers/
    │   ├── routes/
    │   ├── schema.ts
    │   ├── db.ts
    │   └── index.ts
    ├── Dockerfile
    ├── deployment.yaml
    ├── service.yaml
    ├── compose.yaml
    └── package.json

```
## System Architecture
<img src="./ecommerce microservice diagram.png" height="200" alt="ecommerce microservice diagram DFD">

## 1. Product Service
In the Product Microservice, I implemented:
1. Pagination of products to improve the API performance, reducing memory storage, and lowering the server load.
2. Storage for the Product Images in AWS S3 Bucket
3. Database being MongoDB, it was chosen as the database due to its suitability for scenarios with a high View-to-Update ratio (approximately 3%), indicating significantly more read operations compared to write operations.

## 2. User Service
In the User Microservice, I Implemented:
1. Database being PostgreSQL, for relational and transactional operations

### ER Diagram

<img src="https://mermaid.ink/img/pako:eNp9UtluwjAQ_BVrnwEBuf1GS5BQy1EgUlVFiiy8gFViIyfpRfn3OhBoaNU-2TPjsWd3vYel4ggUUPcFW2uWxpKQ2eQ-nJN9uSVkOF4Qwcn07gQX4eOCaLXFRLIUSUkeYlku0TycXVxRNOz_spWOGsSUiS2JxsOHKKzRO5Zlr0rzOrVREq9O3kxMxt74dEfyglqsBPJrTWQJxy3mZ76spExOBudQw1E4X_RGU7LUyMy5hOU_lWLHa0pVaq_fn4XzP4s94iJDnRhyUO9AlmvEvEYsRf5-pZvHavhD7JJyQv_nrVKdxvb52WyqfTUNSkwzxVpm3wOq9HMJlGyYUaEBay040FwX2IAUtWmsgXAsMYZ8g2Z2QM2WM_0cQywPxrNj8kmp9GzTqlhvgK7YNjPo1LrqX11YjZKjvlWFzIF2g-MdQPfwBtSyuy2va1tty3GtwPW9BryXbMsPHLcTBK7nOx3bdg4N-Di-2m4Fvu15vud2fNfy2r5z-AItKdlv?type=png" height="500"/>


## 3. Order Service
In the Order Microservice , Implemented:
1. Database being PostgreSQL, for relational and transactional operations
2. Synchronous Sevice-to-Service Communication between this service and user & product service - when creating an order multiple transactional operations where this service sends a request to the product-service or user-service and await for response.

### ER Diagrams
<img src="https://mermaid.ink/img/pako:eNqNU2tPgzAU_SvN_TwXNsZjfFOHCdE9MlliDAlpaN0aR4ulJO713y2w6UBM7Lfec8-59_bcHiARhIIHVE4YXkucRhzpM19O_GX8HN6Gq2d0qGPlCWYhYgQtHn9Cof8SolxhVeQxxymtkVPEr5QaGqtVMGmLVLEipzJmpFlNSKKjtT56uKLMVlN_GdyfEzLJEtpqqkYwIZLmeSeWMLXrBMp63XKJKLiS3aw9y1rxbCN4tw5NMdt2jarw5xUhmPrahekCJZLqlkiMVRdaZOQXejefP_m3M8TymNAt1XCXNXEQ-tP_-VP3p5GHNpJJQYpENcy7-PNRYK4a73xBmKLpL-P-HLjV9nk3j8ebG3G4bJmHItjgPILG7l3nnMctExPBFWa8yoYerCUj4ClZ0B6kVGp79BWqd4lAbajebChpBMv3knLSnAzzVyHSC02KYr0B7w1vc32rPTl_q-8UyvUj3pdLBJ5VKYB3gE_wzPGg7wxHpmHZ5sh2LbMHO_AGw747tuyBYRmWNXSGtnvqwb6qafTH7shxXMceuLbpGK51-gKfqxnP?type=png" height="500"/>


## Challenges Faced & Learnings

1. Managing inter-service communication failures
2. Handling environment variable configuration across services
3. Understanding difference between ClusterIP and NodePort
Debugging networking issues in Kubernetes
4. Understanding good API development practices like pagination, soft deleting etc.
5. Understanding failures due to version controlling in code, docker images and pod deployments
6. Understood about logging, api-gateway practices, and server debugging.

## Future Improvements

1. Asynchronous communication using Kafka or RabbitMQ (Message Queues)
2. Redis caching layer
3. CI/CD pipeline using GitHub Actions
4. Centralized config management
5. Distributed Authentication and Authorization
6. Language Agnostic Services (using Java, or Golang for concurrency or python for a basic recommender service using user purchase history)
7. Use RDS for databases and EKS for Kubernetes in cloud (optional)

### References:
- [Mastering API Pagination: Best Practices for Performance & Scalability](https://medium.com/@khanshahid9283/mastering-api-pagination-best-practices-for-performance-scalability-ca16980bc8f0)
- [Integrate AWS S3 with Your Node.js Project: A Step-by-Step Guide](https://mrfreelancer9.medium.com/integrate-aws-s3-with-your-node-js-project-a-step-by-step-guide-f7f160ea8d29)
- [Design E-Commerce Applications with Microservices Architecture](https://medium.com/design-microservices-architecture-with-patterns/design-e-commerce-applications-with-microservices-architecture-c69e7f8222e7)
- [How To Perform Full-text Search in MongoDB
](https://www.digitalocean.com/community/tutorials/how-to-perform-full-text-search-in-mongodb)
- [A Comprehensive Guide to Service-to-Service Communication: Synchronous and Asynchronous Approaches.](https://medium.com/@naveethannaveethan13/a-comprehensive-guide-to-service-to-service-communication-synchronous-and-asynchronous-approaches-8798060d39b4)

<!-- - [How to Choose a Database for Microservices — CAP Theorem](https://medium.com/design-microservices-architecture-with-patterns/how-to-choose-a-database-for-microservices-cap-theorem-d1585bf40ecd) -->


#### Advantages of having Mircoservice Architecture (these are what I observed):
1. Isolated Scaling, Deployment and Monitoring
2. It's modular, multiple devs can work independently on different modules
3. If any error occurs in one module, no need to stop all the services
4. Multiple languages can be used (Go, Java, JS, Python etc) each can be used for its features and advantages, like python can be used for ML-related services, Go and Java can be used for concurrency and robust services, node.js can be used for lightweight services (rapid development).

#### Disadvantages of having Mircoservice Architecture (these are what I observed):
1. Too complex to implement for simple backend systems, imagine having to track multiple services' deployments, monitoring and maintainance 
2. Communication and Data Transfer complexity is too much and can raise issues.
3. Data Management Challenges, handling multiple DBs hence handing data between Relational and Non-relational Dbs is challenging.
4. Testing Overhead, too many things to test


> ### _Get Started:_
> I have added the documentation to start and run each service in its designated service folder.