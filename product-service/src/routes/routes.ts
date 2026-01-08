import { Router } from "express";
import { getAllCurrentProductsWithPagination,
  createProduct, 
  deleteProductById, 
  getProductById, 
  updateProductById,
  updateProductPriceById,
  updateProductStockById,
  getProductBySKU,
  getLowStockProducts,
  searchProducts
} from "../controllers/product.controller.js";

import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
})

const router = Router();

// this order matters: more specific routes should be defined before less specific ones
router.get("/", getAllCurrentProductsWithPagination);
router.get("/sku/:productSKU", getProductBySKU);
router.get("/low-stock", getLowStockProducts);
router.get("/search", searchProducts);
router.get("/id/:productId", getProductById);

router.put("/:productId", updateProductById);
router.patch("/:productId/price", updateProductPriceById);
router.patch("/:productId/stock", updateProductStockById);
router.delete("/:productId", deleteProductById);

router.post(
  "/",
  upload.single("image"),
  createProduct
);

export default router;
