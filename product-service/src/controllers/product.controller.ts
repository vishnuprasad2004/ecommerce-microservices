import { Request, Response } from "express";
import Product from "../models/product.js";
import { v4 as uuidv4, validate } from "uuid";
import generateSKU, { isValidateSKU } from "../utils/genSKU.js";
import uploadToS3 from "../utils/uploadToS3.js";
import mongoose from "mongoose";
import redis, { invalidateProductCache } from "../utils/redis.config.js";

/**
 * Get all the products in the platform with pagination
 * GET /products/
 */
export const getAllCurrentProductsWithPagination = async (req: Request, res: Response) => {
  try {

    const { offset = 1, limit = 10 } = req.query;

    const page = parseInt(offset as string, 10) || 1;
    const size = parseInt(limit as string, 10) || 10;
    const skip = (page - 1) * size;
    const products = await Product.find({ isDeleted: false })
      .skip(skip)
      .limit(size)
      .exec();
    
    // addition is the caching layer - redis based on unique cache key for each combination of response
    const cacheKey = `products:page:${page}:size:${size}`;
    const cached = await redis.get(cacheKey);
    if(cached) {
      console.log("Cache hit for key:", cacheKey);
      res.status(200).json(JSON.parse(cached));
      return;
    }

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
      status: "success"
    }
    // cache the response for 5 minutes (300 seconds)
    await redis.setex(cacheKey, 3600, JSON.stringify(response));

    res.status(200).json(response);
    

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error" });
  }
};


/**
 * Get product details by its Id
 * GET /products/:productId
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    if(!validate(productId)) {
      res.status(400).json({
        message: "Product Id is invalid",
        status: "error"
      })
    } 

    const cacheKey = `product:id:${productId}`;

    const cached = await redis.get(cacheKey);
    if(cached) {
      console.log("Cache hit for key:", cacheKey);
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const product = await Product.findOne({ productId, isDeleted: false }).exec();
    if (!product) {
      return res.status(404)
        .json({ message: "Product not found", status: "error" });
    }


    const response = {
      message: `Get product with ${productId} product ID`, 
      data: product, 
      status: "success" 
    }

    // cache the response for 60 minutes (3000 seconds)
    await redis.setex(cacheKey, 3600, JSON.stringify(response));

    res.status(200).json(response);
      
  }
  catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error});
  }
};


/**
 * Get product details by its SKU (Stock Keeping Unit)
 * GET /products/sku/:productSKU
 */
export const getProductBySKU = async (req:Request, res:Response) => {
  try {
    const { productSKU } = req.params;
    if(!productSKU) {
      return res.status(400).json({
        message: "Product SKU is required",
        status: "error"
      });
    }
    if(!isValidateSKU(productSKU)) {
      return res.status(400).json({
        message: "Product SKU is invalid",
        status: "error"
      });
    }

    const product = await Product.findOne({ productSKU, isDeleted: false }).exec();
    if (!product) {
      return res.status(404)
        .json({ message: "Product not found", status: "error" });
    }

    res.status(200)
      .json({ 
        message: `Get product with ${productSKU} product SKU (Stock Keeping Unit)`, 
        data: product, 
        status: "success" 
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error});
  }
}


/**
 * Fetch all the low stock products
 * GET products/low-stock
 */
export const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const { threshold = 50, page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    const cacheKey = `products:low-stock:threshold:${threshold}:page:${pageNumber}:limit:${limitNumber}`;
    const cached = await redis.get(cacheKey);

    if(cached) {
      console.log("Cache hit for key:", cacheKey);
      res.status(200).json(JSON.parse(cached));
      return;
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
      status: "success",
    };

    // cache the response for 30 minutes (1800 seconds)
    await redis.setex(cacheKey, 1800, JSON.stringify(response));

    res.status(200).json(response);


  } catch (error) {
    console.error("Get Low Stock Products Error:", error);
    res.status(500).json({ message: "Internal Server Error", status: "error" });
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
      return res.status(400).json({
        message: "One or more itemIds are invalid",
        status: "error",
      });
    }

    const products = await Product.find({ productId: { $in: itemIds }}, { 
      productId: 1,
      productPrice:1, 
      productStock: 1, 
      productName:1,
      productSKU:1 
    });


    res.status(200).json({
      status: "success",
      message: "Got all the product",
      data: products
    })
  } catch (error) {
    console.error("Error during getting Product Availablity :", error);
    res.status(500).json({ message: "Error during getting Product Availablity", status: "error" });
  }
}



/**
 * Search for products
 * GET /product/search?q=
 */
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q, minPrice, maxPrice, offset = 1, limit = 10 } = req.query;
    const page = parseInt(offset as string, 10) || 1;
    const size = parseInt(limit as string, 10) || 10;
    const skip = (page - 1) * size;
    if (!q || q === "") {
      return res.status(400)
        .json({
          message: "Bad Request. Search query is required",
          status: "error",
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
      status: "success",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error});
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
      return res.status(400)
        .json({
          message: "Bad Request. Missing required fields",
          status: "error",
        });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Product image is required",
        status: "error",
      });
    }

    // generate the stock keeping unit (SKU) id
    const generatedSKU = generateSKU(name, shortDescription, category);
    
    //check if the porduct already exists with the same SKU
    const existingProduct = await Product.findOne({ productSKU: generatedSKU, isDeleted: false }).limit(1).exec();
    if (existingProduct) {
      return res.status(409).json({
        message: "Product already exists with the same SKU",
        status: "error",
      });
    }

    const generatedId = uuidv4();
    
    // upload the product image to AWS S3 bucket and get the URL
    const productImageUrl = await uploadToS3(generatedId, req.file);

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
    const listKeys = await redis.keys("products:list:*");
    if (listKeys.length > 0) {
      await redis.del(...listKeys);
    }

    res
      .status(201)
      .json({
        message: "Product created successfully",
        product: newProduct,
        status: "success",
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
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
      return res.status(400).json({
        message: "Product Id is invalid",
        status: "error"
       });
    }
    
    invalidateProductCache(productId as string); // Invalidate cache for this product ID before updating

    const updateData = req.body;
    const product = await Product.findOne({ productId, isDeleted: false }).limit(1).exec();
    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found", status: "error" });
    }
    Object.keys(updateData).forEach((key) => {
      product.$set(key, updateData[key]);
    });
    await product.save();
    res
      .status(200)
      .json({ message: "Product updated successfully", product, status: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
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
      return res.status(400).json({
        message: "Product Id is invalid",
        status: "error"
       });
    }
    invalidateProductCache(productId as string); // Invalidate cache for this product ID before updating price

    const { price } = req.body;
    const product = await Product.findOneAndUpdate({ productId, isDeleted: false }, { $set: {productPrice: price} }, { new:true }).exec();
    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found", status: "error" });
    }
    // product.$set('productPrice', price);
    // await product.save();
    res
      .status(200)
      .json({ message: "Product price updated successfully", product, status: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
  }
};



/**
 * Deduct the stock of the products in the order
 * PATCH products/deduct-stock
 */
export const deductMultipleProductStock = async (req:Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items }: {items:Array<{productId:string, quantity:number}>} = req.body;
    
    
    const itemIdsValidity = items.map((item) => {
      return validate(item.productId)
    });

    const areValid = itemIdsValidity.reduce((acc, curr) => {
      return acc && curr;
    }, true);

    if (!areValid) {
      return res.status(400).json({
        message: "One or more items are invalid",
        status: "error",
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

      items.map((item) => {
        invalidateProductCache(item.productId); // Invalidate cache for each product ID before updating stock
      });

    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Stock deducted successfully",
      status: "success"
    })
  } catch(error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(409).json({
      message: "Insufficient stock for one or more items",
      status: "error"
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
      return res.status(400).json({
        message: "Product Id is invalid",
        status: "error"
       });
    }
    
    const { stock } = req.body;
    
    const product = await Product.findOneAndUpdate({ productId, isDeleted: false }, { $set: {productStock: stock}}, {new: true}).exec();
    
    invalidateProductCache(productId as string); // Invalidate cache for this product ID before updating stock
    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found", status: "error" });
    }
    // product.$set('productStock', stock);
    // await product.save();
    res
      .status(200)
      .json({ message: "Product stock updated successfully", product, status: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error});
  }
};


export const deleteProductById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    if(!validate(productId)) {
      return res.status(400).json({
        message: "Product Id is invalid",
        status: "error"
       });
    }
    const product = await Product.findOne({ productId, isDeleted: false }).exec();
    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found", status: "error" });
    }
    product.$set('isDeleted', true);
    await product.save();
    invalidateProductCache(productId as string); // Invalidate cache for this product ID after deletion
    res
      .status(200)
      .json({ message: "Product deleted successfully", status: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error});
  } 
};