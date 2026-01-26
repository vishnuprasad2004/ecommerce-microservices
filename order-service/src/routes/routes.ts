import { Router } from "express";
import { createOrder, getOrder, listOrders } from "../controllers/orders.controller.js";

const router = Router();

router.get("/list", listOrders);
router.get("/:orderId", getOrder);

router.post("/", createOrder);




export default router;
