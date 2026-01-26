import { Request, Response } from "express";
import { db } from "../db.js";
import { orders, orderItems } from "../schema.js";

import { and, eq } from "drizzle-orm";

/**
 * 
input:
{
  "userId": "uuid",
  "items": [
    {
      "productId": "abc123",
      "quantity": 2
    }
  ],
  "shippingAddressId": "uuid",  // any one of these
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "USA"
  },
  "email": "user@email.com",
  "phone": "1234567890"     
}
 */

type CreateOrderRequest = {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddressId?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  email: string;
  phone: string;
  orderTax: number;
};

export const createOrder = async (req: Request, res: Response) => {
  //transactional logic to create order and order items
  // get all the information from req.body
  const { email, items, orderTax, phone, userId, shippingAddress, shippingAddressId }: CreateOrderRequest = req.body;
  
  if (!userId || !items || items.length === 0) {
    return res.status(400).json({
      message: 'userId and items are required',
      status: 'error',
    });
  }

  if (!shippingAddressId && !shippingAddress) {
    return res.status(400).json({
      message: 'Either shippingAddressId or shippingAddress is required',
      status: 'error',
    });
  }

  try {

    //validate the user and the shipping address here

    const user = await fetch(`http://localhost:3002/users/${userId}`);
    if(user.status !== 200) {
      return res.status(400).json({
        message: 'Invalid userId',
        status: 'error',
      });
    }

    const address = shippingAddress || await (async () => {
      const res = await fetch(`http://localhost:3002/address/${shippingAddressId}`);
      if(res.status !== 200) {
        throw new Error('Invalid shippingAddressId');
      }
      return res.json();
    })();

    // check for product availability and get product prices -> for this I made a bulk fetch POST API in product-service
    const productAvailabilityResponse = await fetch(`http://localhost:3001/products/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productIds: items.map(item => item.productId),
      }),
    });

    if (productAvailabilityResponse.status !== 200) {
      return res.status(400).json({
        message: 'Error checking product availability',
        status: 'error',
      });
    }
    const productData = await productAvailabilityResponse.json();

    // calculate the total price with tax, discounts, shippingcost and coupons ... for now only total price and static tax value
    let subtotal = 0;
    
    for (const item of items) {
      const product = productData.data.find((p: any) => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          message: `Product ${item.productId} is out of stock or insufficient quantity`,
          status: 'error',
        });
      }
      subtotal += product.price * item.quantity;
    }

    let tax = orderTax || 0;
    let orderPrice = subtotal + (subtotal * tax) / 100;

    const orderStatus = 1;
    
    // deduce the stock in product-service
    try {
      const stockUpdateResponse = await fetch(`http://localhost:3001/products/deduct-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      if (stockUpdateResponse.status !== 200) {
        return res.status(400).json({
          message: 'Error updating product stock',
          status: 'error',
        });
      }
    } catch (error) {
      console.log("Error updating product stock:", error);
      return res.status(500).json({
        message: 'Failed to reserve products. Please try again.',
        status: 'error',
      });
    }

    // insert into orders table and get the order id
    const newOrder = await db.transaction(async (tx) => {
      // 1️⃣ Insert order
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          orderStatus: orderStatus || 1,
          orderPrice: orderPrice.toString(),
          orderAddress: address.street,
          email: email,
          phone: phone,
          orderCity: address.city,
          orderState: address.state,
          orderCountry: address.country,
          orderZip: address.zip,
          orderTax,

        })
        .returning();

      // 2️⃣ Insert order items
      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: order!.id,
          productId: item.productId,
          quantity: item.quantity.toString(),
          itemPrice: productData.data.find((p: any) => p.id === item.productId).price.toString(),
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
  const orderId = req.params.id as string;
  // Logic to get an order by ID
  try {

    const orderDetails = db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.isDeleted, false)));

    res.status(200).json({ 
      message: `Order details for ID: ${orderId}`,
      status: "success",
      data: orderDetails,
    });
  
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: "error",
      trace: error,
    });
  }
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