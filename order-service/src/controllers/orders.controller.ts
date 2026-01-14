import { Request, Response } from "express";
import { db } from "../db.js";
import { orders, orderItems } from "../schema.js";


type CreateOrderRequest = {
  userId: string;
  orderDate: string;
  orderStatus: number;
  orderAddress: string;
  orderCity: string;
  orderState: string;
  orderCountry: string;
  orderZip: string;
  orderEmail: string;
  orderTax: number;
  items: Array<{
    productId: string;
    quantity: number;
    itemPrice: number;
  }>;
};

export const createOrder = async (req: Request, res: Response) => {
  //transactional logic to create order and order items
  try {

    // get all the information from req.body
    const { userId, orderDate, orderStatus, orderAddress, orderCity, orderState, orderCountry, orderZip, orderEmail, orderTax, items }: CreateOrderRequest = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Order must contain at least one item",
        status: "error",
      });
    }

    // calulate total price and apply tax if needed
    let orderPrice = items.reduce((total, item) => total + (item.itemPrice * item.quantity), 0);
    
    if (orderTax != 0) {
      const taxAmount = (orderPrice * orderTax) / 100;
      orderPrice = orderPrice + taxAmount;
    }

    // insert into orders table and get the order id
    const newOrder = await db.transaction(async (tx) => {
      // 1️⃣ Insert order
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          orderDate: new Date(orderDate),
          orderStatus: orderStatus || 1,
          orderPrice: orderPrice.toString(),
          orderAddress,
          orderCity,
          orderState,
          orderCountry,
          orderZip,
          orderEmail,
          orderTax,
        })
        .returning();

      // 2️⃣ Insert order items
      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: order!.id,
          productId: item.productId,
          quantity: item.quantity.toString(),
          itemPrice: item.itemPrice.toString(),
        }))
      );

      return order;
    });
    // insert into order items table with the order id
    // return the created order details

    res.status(201).json({
      message: "Order created successfully",
      status: "success",
      data: newOrder,
    });

  } catch (error) { 
    console.error("Error creating order:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: "error",
      trace: error,
    });
  }
};

export const getOrder = (req: Request, res: Response) => {
  const orderId = req.params.id;
  // Logic to get an order by ID
  res.status(200).json({ message: `Order details for ID: ${orderId}` });
}

export const listOrders = (req: Request, res: Response) => {
  // Logic to list all orders
  res.status(200).json({ message: "List of all orders" });
}

export const updateOrderStatus = (req: Request, res: Response) => {
  const orderId = req.params.id;
  const { status } = req.body;
  // Logic to update order status
  res.status(200).json({ message: `Order ID: ${orderId} status updated to ${status}` });
}

export const deleteOrder = (req: Request, res: Response) => {
  const orderId = req.params.id;
  // Logic to delete an order
  res.status(200).json({ message: `Order ID: ${orderId} deleted successfully` });
}