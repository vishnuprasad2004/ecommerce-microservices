import { Request, Response } from "express";
import Product from "../models/product.js";
import { v4 as uuidv4, validate } from "uuid";
import generateSKU, { isValidateSKU } from "../utils/genSKU.js";
import uploadToS3 from "../utils/uploadToS3.js";
import mongoose from "mongoose";
import redis, { invalidateProductCache } from "../utils/redis.config.js";
import logger, { logError } from "../utils/logger.js";
import { log } from "node:console";

/**
 * Get all the products in the platform with pagination
 * GET /products/
 */
export const getAllCurrentProductsWithPagination = async (req: Request, res: Response) => {
  
  const { offset = 1, limit = 10 } = req.query;
  
  const page = parseInt(offset as string, 10) || 1;
  const size = parseInt(limit as string, 10) || 10;
  const skip = (page - 1) * size;
  
  const cacheKey = `products:page:${page}:size:${size}`;
  
  try {
    
    // addition is the caching layer - redis based on unique cache key for each combination of response
    try {
      const cached = await redis.get(cacheKey);
      if(cached) {
      logger.info("Cache hit for key:", { cacheKey });
      res.status(200).json(JSON.parse(cached));
      return;
    }
    } catch(err) {
      logger.warn("Redis unreachable, falling back to DB", { err });
    }
    

    const products = await Product.find({ isDeleted: false })
      .skip(skip)
      .limit(size)
      .exec();
    
    const totalItems = await Product.countDocuments({ isDeleted: false }).exec();

    const response = {
      message: "Get all current available products", 
      data: products,
      pagination: {
        currentPage: page,
        pageSize: size,
        totalItems,
        totalPages: Math.ceil(totalItems / size),
      }, 
      success: 1
    }
    // cache the response for 5 minutes (300 seconds)
    try{
      await redis.setex(cacheKey, 3600, JSON.stringify(response));
    } catch(err) {
      logger.warn("Failed to cache in Redis", { cacheKey, err });
    }

    res.status(200).json(response);
    logger.info(`Fetched products for page ${page} with size ${size}`, { cacheKey, totalItems, productIds: products.map(p => p.productId).slice(0,2).join(", ").concat(products.length > 2 ? ", ..." : "") }); 

  } catch (error) {
    logError("Error fetching product by ID", error, { 
      cacheKey,
      route: req.path 
    });
    res.status(500).json({ message: "Internal Server Error", success: 0 });
  }
};


/**
 * Get product details by its Id
 * GET /products/id/:productId
 */
export const getProductById = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const cacheKey = `product:id:${productId}`;

  try {
    if(!validate(productId)) {
      logger.warn("Product ID is invalid", { productId });
      res.status(400).json({
        message: "Product Id is invalid",
        success: 0
      })
    } 

    try {
      const cached = await redis.get(cacheKey);
      if(cached) {
        logger.info("Cache hit for key:", { cacheKey });
        res.status(200).json(JSON.parse(cached));
        return;
      }

    } catch(err) {
      logger.warn("Redis unreachable, falling back to DB", { err });
    }

    const product = await Product.findOne({ productId, isDeleted: false }).exec();
    if (!product) {
      logger.warn("Product not found with ID", { productId });
      return res.status(404)
        .json({ message: "Product not found", success: 0 });
    }


    const response = {
      message: `Get product with ${productId} product ID`, 
      data: product, 
      success: 1
    }

    // cache the response for 60 minutes (3000 seconds)
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(response));
    } catch(err) {
      logger.warn("Failed to cache in Redis", { cacheKey, err });
    }

    res.status(200).json(response);
    logger.info(`Fetched product with ID ${productId}`, { cacheKey, productId, product });
      
  }
  catch (error) {
    logError("Error fetching product by ID", error, { 
      productId, 
      cacheKey,
      route: req.path 
    });
    res.status(500).json({ message: "Internal Server Error", success: 0 });
  }
};


/**
 * Get product details by its SKU (Stock Keeping Unit)
 * GET /products/sku/:productSKU
 */
export const getProductBySKU = async (req:Request, res:Response) => {
  const { productSKU } = req.params;
  const cacheKey = `product:sku:${productSKU}`;
  try {
    if(!productSKU) {
      logger.warn("Product SKU is required", { productSKU });
      return res.status(400).json({
        message: "Product SKU is required",
        success: 0
      });
    }

    if(!isValidateSKU(productSKU)) {
      logger.warn("Product SKU is invalid", { productSKU });
      return res.status(400).json({
        message: "Product SKU is invalid",
        success: 0
      });
    }

    const product = await Product.findOne({ productSKU, isDeleted: false }).exec();
    if (!product) {
      logger.warn("Product not found with SKU", { productSKU });
      return res.status(404)
        .json({ message: "Product not found", success: 0 });
    }

    res.status(200)
      .json({ 
        message: `Get product with ${productSKU} product SKU (Stock Keeping Unit)`, 
        data: product, 
        success: 1 
      });
    logger.info(`Fetched product with SKU ${productSKU}`, { productSKU, product });
  } catch (error) {
    logError("Error fetching product by SKU", error, { 
      productSKU, 
      cacheKey,
      route: req.path 
    });
    res.status(500).json({ message: "Internal Server Error", success: 0 });
  }
}


/**
 * Fetch all the low stock products
 * GET products/low-stock
 */
export const getLowStockProducts = async (req: Request, res: Response) => {
  const { threshold = 50, page = 1, limit = 10 } = req.query;
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;
  
  const cacheKey = `products:low-stock:threshold:${threshold}:page:${pageNumber}:limit:${limitNumber}`;
  try {
    
    try {
      const cached = await redis.get(cacheKey);
      if(cached) {
      logger.info("Cache hit for key:", { cacheKey });
      res.status(200).json(JSON.parse(cached));
      return;
    }
    } catch(err) {
      logger.warn("Redis unreachable, falling back to DB", { err });
    }

    const totalCount = await Product.countDocuments({ 
      productStock: { $gte: 0, $lte: Number(threshold) } 
    });
    
    const products = await Product.find({ 
      productStock: { $gte: 0, $lte: Number(threshold) } 
    })
      .limit(limitNumber)
      .skip(skip)
      .sort({ productStock: 1 });
    
    const response = {
      message: "Low stock products fetched successfully",
      products,
      threshold: Number(threshold),
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
      success: 1,
    };

    // cache the response for 30 minutes (1800 seconds)
    try{
      await redis.setex(cacheKey, 1800, JSON.stringify(response));
    } catch(err) {
      logger.warn("Failed to cache in Redis", { cacheKey, err });
    }

    res.status(200).json(response);
    logger.info(`Fetched low stock products with threshold ${threshold} for page ${pageNumber} with limit ${limitNumber}`, { cacheKey, totalCount, products: products.map(p => p.productId).slice(0,2).join(", ").concat(products.length > 2 ? ", ..." : "") });


  } catch (error) {
    logError("Error fetching Low Stock Products", error, { 
      threshold,
      cacheKey,
      route: req.path 
    });
    res.status(500).json({ message: "Internal Server Error", success: 0 });
  }
};


/**
 * Get product availablity
 * GET products/availability
 */
export const getProductAvailability = async (req: Request, res: Response) => {
  try { 
    const { itemIds }: {itemIds:Array<string>} = req.body;
    const itemIdsValidity = itemIds.map((itemId) => {
      return validate(itemId)
    });

    const areValid = itemIdsValidity.reduce((acc, curr) => {
      return acc && curr;
    }, true);

    if (!areValid) {
      logger.warn("Invalid itemIds provided when checking availability", { itemIds });
      return res.status(400).json({
        message: "One or more itemIds are invalid",
        success: 0,
      });
    }

    const products = await Product.find({ productId: { $in: itemIds }}, { 
      productId: 1,
      productPrice:1, 
      productStock: 1, 
      productName:1,
      productSKU:1 
    });

    logger.info("Fetched product availability information", { itemIds, products });
    res.status(200).json({
      success: 1,
      message: "Got all the product",
      data: products
    })
  } catch (error) {
    logError("Error during getting Product Availablity", error, {
      route: req.path,
      body: req.body
    })
    res.status(500).json({ message: "Error during getting Product Availablity", success: 0 });
  }
}


/**
 * Search for products
 * GET /product/search?q=
 */
export const searchProducts = async (req: Request, res: Response) => {
  const { q, minPrice, maxPrice, offset = 1, limit = 10 } = req.query;
  try {
    const page = parseInt(offset as string, 10) || 1;
    const size = parseInt(limit as string, 10) || 10;
    const skip = (page - 1) * size;
    if (!q || q === "") {
      logger.warn("Search query is required", { query: q });
      return res.status(400)
        .json({
          message: "Bad Request. Search query is required",
          success: 0,
        });
    }

    const conditions: any[] = [{ isDeleted: false }, { $text: { $search: q as string } }];
    if (minPrice !== undefined && maxPrice !== undefined) {
      conditions.push({ productPrice: { $gte: Number(minPrice), $lte: Number(maxPrice) } });
    } else if( minPrice !== undefined) {
      conditions.push({ productPrice: { $gte: Number(minPrice) } });
    } else if (maxPrice !== undefined) {
      conditions.push({ productPrice: { $lte: Number(maxPrice) } });
    }

    const query = { $and: conditions };
    
    const products = await Product.find(query, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(size)
      .lean()
      .exec();

    const productsCount = await Product.countDocuments(query)
      .exec();

    
    res.status(200).json({
      message: "Searched products fetched successfully",
      products,
      pagination: {
        total: productsCount,
        page,
        limit: size,
        totalPages: Math.ceil(productsCount / size),
      },
      success: 1,
    });

    logger.info(`Searched products for query "${q}"`, { total: productsCount, page, limit });

  } catch (error) {
    logError("Error searching products", error, { 
      query: q, 
      minPrice, 
      maxPrice, 
      offset, 
      limit, 
      route: req.path 
    });
    res.status(500).json({ message: "Internal Server Error", success: 0 });
  } 
};


interface CreateProductRequest {
  name: string;
  shortDescription: string;
  longDescription?: string;
  price: number;
  category?: string;
  weight: number;
}

/**
 * Create a new product
 * POST /products/
 */
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, longDescription, shortDescription, price, category, weight }: CreateProductRequest = req.body;

    if ([name, shortDescription].includes("") || price === undefined || weight === undefined) {
      logger.warn("Bad Request, Missing required fields when creating a product", {})
      return res.status(400)
        .json({
          message: "Bad Request. Missing required fields",
          success: 0,
        });
    }

    if (!req.file) {
      logger.warn("Bad Request, Product image is required when creating a product", {})
      return res.status(400).json({
        message: "Product image is required",
        success: 0,
      });
    }

    // generate the stock keeping unit (SKU) id
    const generatedSKU = generateSKU(name, shortDescription, category);
    
    //check if the porduct already exists with the same SKU
    const existingProduct = await Product.findOne({ productSKU: generatedSKU, isDeleted: false }).limit(1).exec();
    if (existingProduct) {
      return res.status(409).json({
        message: "Product already exists with the same generated SKU, Please change the name, short description or category",
        success: 0,
      });
    }

    const generatedId = uuidv4();
    
    // upload the product image to AWS S3 bucket and get the URL
    
    // const productImageUrl = await uploadToS3(generatedId, req.file);
    let productImageUrl: string;
    try {
      productImageUrl = await uploadToS3(generatedId, req.file);
    } catch (s3Error) {
      logger.error("S3 Upload Failed", { error: s3Error, productId: generatedId });
      return res.status(502).json({ message: "Image upload failed. Please try again.", success: 0 });
    }

    const newProduct = await Product.create({
      productId: generatedId,
      productName: name,
      productSKU: generatedSKU,
      productPrice: price,
      productWeight: weight,
      productImage: productImageUrl === "" ? undefined : productImageUrl,
      productShortDescription: shortDescription,
      productLongDescription: longDescription,
      productCategory: category,
    });

    // remove the cached paginated list of products in redis to ensure cache consistency after creating a new product
    try {
      const listKeys = await redis.keys("products:page:*");
      if (listKeys.length > 0) {
        await redis.del(...listKeys);
      }
      logger.info("Product cache invalidated", { count: listKeys.length });
    } catch(err) {
      logger.warn("Cache invalidation failed - data may be stale", { error: err });
    }

    res
      .status(201)
      .json({
        message: "Product created successfully",
        product: newProduct,
        success: 1,
      });

  } catch (error) {
    logError("Create Product Critical Failure", error, {
      body: req.body,
      route: req.path
    })
    res.status(500).json({ message: "Internal Server Error", success: 0 });
  }
};

/**
 * Update product details by product ID
 * PUT /products/:productId
 */
export const updateProductById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if(!validate(productId)) {
      logger.warn("Product ID is invalid for update", { productId });
      return res.status(400).json({ message: "Product Id is invalid", success: 0});
    }
    
    try {
      await invalidateProductCache(productId as string); // Invalidate cache for this product ID before updating
    } catch(err) {
      logger.warn("Cache invalidation failed - data may be stale", { productId, error: err });
    }

    const updateData = req.body;

    const product = await Product.findOne({ productId, isDeleted: false }).limit(1).exec();

    if (!product) {
      logger.warn("Product not found for update with ID", { productId });
      return res.status(404)
        .json({ message: "Product not found", success: 0 });
    }

    // now we have the product document, we can update the fields and save it
    Object.keys(updateData).forEach((key) => {
      product.$set(key, updateData[key]);
    });
    await product.save();

    logger.info(`Product updated with ID ${productId}`, { productId, updateData });
    res.status(200)
      .json({ message: "Product updated successfully", product, success: 1 });
  } catch (error) {
    logError("Update Product Critical Failure", error, {
      route: req.path,
      body: req.body,      
      productId: req.params.productId
    });
    res.status(500).json({ message: "Internal Server Error", success: 0, trace: error });
  } 
};

/**
 * Update product price by product ID
 * PATCH /products/:productId/price
 */
export const updateProductPriceById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if(!validate(productId)) {
      logger.warn("Product ID is invalid for price update", { productId });
      return res.status(400).json({
        message: "Product Id is invalid",
        success: 0,
       });
    }

    try {
      await invalidateProductCache(productId as string); // Invalidate cache for this product ID before updating price
    } catch(err) {
      logger.warn("Cache invalidation failed - data may be stale", { productId, error: err });
    }

    const { price } = req.body;

    const product = await Product.findOneAndUpdate({ productId, isDeleted: false }, { $set: {productPrice: price} }, { new:true }).exec();
    if (!product) {
      logger.warn("Product not found for price update with ID", { productId });
      return res.status(404)
        .json({ message: "Product not found", success: 0 });
    }

    // product.$set('productPrice', price);
    // await product.save();
    logger.info(`Product price updated for product ID ${productId}`, { productId, newPrice: price });
    res.status(200)
      .json({ message: "Product price updated successfully", product, success: 1 });
  } catch (error) {
    logError("Update Product Price Error", error, {
      route: req.path,
      body: req.body,
      productId: req.params.productId
    });
    res.status(500).json({ message: "Internal Server Error", success: 0, trace: error });
  }
};



/**
 * Deduct the stock of the products in the order
 * PATCH products/deduct-stock
 */
export const deductMultipleProductStock = async (req:Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { items }: {items:Array<{productId:string, quantity:number}>} = req.body;
  try {
    
    
    const itemIdsValidity = items.map((item) => {
      return validate(item.productId)
    });

    const areValid = itemIdsValidity.reduce((acc, curr) => {
      return acc && curr;
    }, true);

    if (!areValid) {
      logger.warn("Invalid productIds provided for stock deduction", { items });
      return res.status(400).json({
        message: "One or more items are invalid",
        success: 0,
      });
    }

    for (const item of items) {
      const updated = await Product.findOneAndUpdate(
        {
          productId: item.productId,
          isDeleted: false,
          productStock: { $gte: item.quantity }
        },
        {
          $inc: { productStock: -item.quantity }
        },
        { new: true, session }
      );

      if (!updated) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      try {
        await Promise.all(items.map((item) => 
          invalidateProductCache(item.productId) // Invalidate cache for each product ID before updating stock
        ));
      } catch(err) {
        logger.warn("Cache invalidation failed during stock deduction - data may be stale", { items, error: err });
      }

    }

    await session.commitTransaction();
    session.endSession();

    logger.info("Stock deducted successfully for items", { items });
    return res.status(200).json({
      message: "Stock deducted successfully",
      success: 1
    })
  } catch(error) {
    await session.abortTransaction();
    session.endSession();

    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      logger.warn("Insufficient stock for one or more items during stock deduction", { items });
    } else {
      logError("Error during stock deduction", error, {
        route: req.path,
        body: req.body
      });
    }

    res.status(409).json({
      message: "Insufficient stock for one or more items",
      success: 0
    });
  }
}


/**
 * Update product stock by product ID (no validation, for admins)
 * PATCH /products/:productId/stock
 */
export const updateProductStockById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    if(!validate(productId)) {
      logger.warn("Product ID is invalid for stock update", { productId });
      return res.status(400).json({
        message: "Product Id is invalid",
        success: 0
      });
    }
    
    const { stock } = req.body;
    
    const product = await Product.findOneAndUpdate({ productId, isDeleted: false }, { $set: {productStock: stock}}, {new: true}).exec();
    
    try {
      await invalidateProductCache(productId as string); // Invalidate cache for this product ID before updating stock
    } catch(err) {
      logger.warn("Cache invalidation failed - data may be stale", { productId, error: err });
    } 

    if (!product) {
      logger.warn("Product not found for stock update with ID", { productId });
      return res.status(404)
        .json({ message: "Product not found", success: 0 });
    }
    // product.$set('productStock', stock);
    // await product.save();
    logger.info(`Product stock updated for product ID ${productId}`, { productId, newStock: stock });
    res.status(200)
      .json({ message: "Product stock updated successfully", product, success: 1 });
  } catch (error) {
    logError("Update Product Stock Error", error, {
      route: req.path,
      body: req.body,
      productId: req.params.productId
    });
    res.status(500).json({ message: "Internal Server Error", success: 0, trace: error});
  }
};

/**
 * Soft delete a product by its ID (mark as deleted without actually removing from DB to keep data integrity and for audit purposes)
 * DELETE /products/:productId
 */
export const deleteProductById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    if(!validate(productId)) {
      logger.warn("Product ID is invalid for deletion", { productId });
      return res.status(400).json({
        message: "Product Id is invalid for deletion",
        success: 0,
      });
    }
    const product = await Product.findOne({ productId, isDeleted: false }).exec();
    if (!product) {
      logger.warn("Product not found for deletion with ID", { productId });
      return res
        .status(404)
        .json({ message: "Product not found", success: 0 });
    }
    product.$set('isDeleted', true);
    await product.save();

    try {
      invalidateProductCache(productId as string); // Invalidate cache for this product ID after deletion
    } catch(err) {
      logger.warn("Cache invalidation failed after deletion - data may be stale", { productId, error: err });
    }

    logger.info(`Product with ID ${productId} marked as deleted`, { productId });

    res.status(200)
      .json({ message: "Product deleted successfully", success: 1 });
  } catch (error) {
    logError("Delete Product Error", error, {
      route: req.path,
      productId: req.params.productId
    });
    res.status(500).json({ message: "Internal Server Error", success: 0 });
  } 
};