import { Request, Response } from "express";
import Product from "../models/product.js";
import { v4 as uuidv4 } from "uuid";
import generateSKU from "../utils/genSKU.js";
import uploadToS3 from "../utils/uploadToS3.js";

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
    const totalItems = await Product.countDocuments({ isDeleted: false }).exec();

    res.status(200)
      .json({ 
        message: "Get all current available products", 
        data: products,
        pagination: {
          currentPage: page,
          pageSize: size,
          totalItems,
          totalPages: Math.ceil(totalItems / size),
        }, 
        status: "success" 
      });

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

    const product = await Product.findOne({ productId, isDeleted: false }).exec();
    if (!product) {
      return res.status(404)
        .json({ message: "Product not found", status: "error" });
    }

    res.status(200)
      .json({ 
        message: `Get product with ${productId} product ID`, 
        data: product, 
        status: "success" 
      });
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

    const product = await Product.findOne({ equals:{ productSKU, isDeleted: false }}).exec();
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
    const existingProduct = await Product.findOne({ equals: { productSKU: generatedSKU, isDeleted: false }}).limit(1).exec();
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
    const updateData = req.body;
    const product = await Product.findOne({ equals:{ productId, isDeleted: false }}).limit(1).exec();
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
 * Update product stock by product ID
 * PATCH /products/:productId/stock
 */
export const updateProductStockById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;
    const product = await Product.findOneAndUpdate({ productId, isDeleted: false }, { $set: {productStock: stock}}, {new: true}).exec();
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
    const product = await Product.findOne({ productId, isDeleted: false }).exec();
    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found", status: "error" });
    }
    product.$set('isDeleted', true);
    await product.save();
    res
      .status(200)
      .json({ message: "Product deleted successfully", status: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error});
  } 
};