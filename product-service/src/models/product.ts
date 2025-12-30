import mongoose from "mongoose";

interface ProductAttrs {
	productId: string;
	productName: string;
	productSKU: string;
	productPrice: number;
	productWeight?: number;
	productImage?: string;
	productDescription?: string;
	productCategory?: string;
	productStock: number;
}

const productSchema = new mongoose.Schema({
	productId: { type: String, required: true, unique: true },
  productName: { type: String, required: true},
  productSKU: { type: String, required: true},
	productPrice: { type: Number, required: true },
	productWeight: { type: Number },
	productImage: { type: String },
	productDescription: { type: String },
	productCategory: { type: String  },
	productStock: { type: Number, required: true },
}, { timestamps: true });

const Product = mongoose.model<ProductAttrs>("Product", productSchema);

export default Product;