# Product-Service

* In the Product-Service, MongoDB was chosen as the database due to its suitability for scenarios with a high View-to-Update ratio (approximately 3%), indicating significantly more read operations compared to write operations. As a document-oriented database, MongoDB offers optimized performance for read-heavy workloads, making it a more efficient choice compared to relational databases in this context.
* Implmented Soft-deleting, i.e. a technique where records are not permanently removed from the database but are instead marked as deleted, typically using a flag like `isDeleted`. It helps in Data Recovery, Auditing, Historial Analysis. I used a isDeleted flag for each product.


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
