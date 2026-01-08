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
  productSKU: { type: String, required: true, unique: true },
	productPrice: { type: Number, required: true },
	productWeight: { type: Number, required: true },
	productImage: { type: String },
	productShortDescription: { type: String, required: true },
	productLongDescription: { type: String },
	productCategory: { type: String  },
	productStock: { type: Number, required: true, default: 0 },
	isDeleted: { type: Boolean, required: true, default: false }
}, { timestamps: true });

/**
 * MongoDB text indexes are specialized indexes that support efficient full-text search queries on string content within a collection. They improve performance by tokenizing and stemming words, allowing for faster searches on general terms, phrases, and word variations than a full collection scan would require. 
 * Text indexes can be created on one or more string fields in a document, enabling complex search capabilities such as relevance ranking and language-specific stemming.
 */
productSchema.index({
	productName: "text",
	productSKU: "text",
	productShortDescription: "text",
	productLongDescription: "text",
	productCategory: "text"
}, {
	// In MongoDB, text index weights are used to control the relevance score of matching documents when performing a text search across multiple fields
	weights: {
		productName: 10,
		productSKU: 8,
		productCategory: 5,
		productShortDescription: 3,
		productLongDescription: 1,
	}
})

const Product = mongoose.model<ProductAttrs>("Product", productSchema);

export default Product;