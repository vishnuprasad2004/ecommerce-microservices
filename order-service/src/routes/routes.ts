import { Router } from "express";
import { createOrder, 
  getOrder, 
  getOrderStats, 
  getUserOrders, 
  listOrders, 
  updateOrderStatus, 
  deleteOrder, 
} from "../controllers/orders.controller.js";

const router = Router();

router.get("/list", listOrders);
router.get('/stats', getOrderStats);
router.get("/:id", getOrder);
router.get('/user/:userId', getUserOrders);

router.patch("/:id", updateOrderStatus);

router.post("/", createOrder);

router.delete("/:id", deleteOrder);


export default router;
