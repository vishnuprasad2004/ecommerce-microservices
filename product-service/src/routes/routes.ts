import { Router } from "express";
import { getAllCurrentProductsWithPagination,
  createProduct, 
  deleteProductById, 
  getProductById, 
  updateProductById,
  updateProductPriceById,
  updateProductStockById,
  getProductBySKU
} from "../controllers/product.controller.js";

import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
})

const router = Router();


router.get("/", getAllCurrentProductsWithPagination);
router.get("/:productId", getProductById);
router.get("/sku/:productSKU", getProductBySKU);

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
