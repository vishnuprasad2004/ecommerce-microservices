# E-commerce Microservices with Kubernetes

## 1. Product Service
In the Product Microservice, I implemented:
1. Pagination of products to improve the API performance, reducing memory storage, and lowering the server load.
2. Storage for the Product Images in AWS S3 Bucket
3. Database being MongoDB, it was chosen as the database due to its suitability for scenarios with a high View-to-Update ratio (approximately 3%), indicating significantly more read operations compared to write operations.

### Refernces:
- [Mastering API Pagination: Best Practices for Performance & Scalability](https://medium.com/@khanshahid9283/mastering-api-pagination-best-practices-for-performance-scalability-ca16980bc8f0)
- [Integrate AWS S3 with Your Node.js Project: A Step-by-Step Guide](https://mrfreelancer9.medium.com/integrate-aws-s3-with-your-node-js-project-a-step-by-step-guide-f7f160ea8d29)
- [Design E-Commerce Applications with Microservices Architecture](https://medium.com/design-microservices-architecture-with-patterns/design-e-commerce-applications-with-microservices-architecture-c69e7f8222e7)
- [How To Perform Full-text Search in MongoDB
](https://www.digitalocean.com/community/tutorials/how-to-perform-full-text-search-in-mongodb)
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


## Tech Stack:
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) 
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/kubernetes-%23326ce5.svg?style=for-the-badge&logo=kubernetes&logoColor=white)