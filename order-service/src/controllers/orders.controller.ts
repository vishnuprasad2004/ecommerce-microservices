import { Request, Response } from "express";
import { db } from "../db.js";
import { orders, orderItems } from "../schema.js";

import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { validate } from "uuid";


const ORDER_STATUS_CREATED = 1;
const ORDER_STATUS_PAID = 2;
const ORDER_STATUS_SHIPPED = 3;
const ORDER_STATUS_DELIVERED = 4;
const ORDER_STATUS_CANCELLED = 5;

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


/**
 * Create a new order
 * POST /orders/
 */
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

    const user = await fetch(`http://localhost:3002/api/users/${userId}`);
    console.log(`User validation response :`, user);
    
    if(user.status !== 200) {
      return res.status(400).json({
        message: 'Invalid userId',
        status: 'error',
      });
    }

    const address = shippingAddress || await (async () => {
      const res = await fetch(`http://localhost:3002/api/address/${shippingAddressId}`);
      console.log(`Address validation response :`, res);
      if(res.status !== 200) {
        throw new Error('Invalid shippingAddressId');
      }
      return res.json();
    })();

    // check for product availability and get product prices -> for this I made a bulk fetch POST API in product-service
    const productAvailabilityResponse = await fetch(`http://localhost:3001/api/products/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemIds: items.map(item => item.productId),
      }),
    });
    console.log(`Product availability response :`, productAvailabilityResponse);
    if (productAvailabilityResponse.status !== 200) {
      return res.status(400).json({
        message: 'Error checking product availability',
        status: 'error',
      });
    }
    const productData = await productAvailabilityResponse.json();
    console.log(`Product data :`, productData);

    // calculate the total price with tax, discounts, shippingcost and coupons ... for now only total price and static tax value
    let subtotal = 0;
    
    for (const item of items) {
      const product = productData.data.find((p: any) => p.productId === item.productId);
      console.log(`Product for item ${item.productId} :`, product);
      if (!product || product.productStock < item.quantity) {
        return res.status(400).json({
          message: `Product ${item.productId} is out of stock or insufficient quantity`,
          status: 'error',
        });
      }
      subtotal += product.productPrice * item.quantity;
    }

    let tax = Number(orderTax) || 0;
    let orderPrice = subtotal + (subtotal * tax) / 100;

    const orderStatus = 1;
    
    // deduce the stock in product-service
    try {
      const stockUpdateResponse = await fetch(`http://localhost:3001/api/products/deduct-stock`, {
        method: 'PATCH',
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
      console.log(`Stock update response :`, stockUpdateResponse);

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
          orderTax: tax,

        })
        .returning();

      // 2️⃣ Insert order items
      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: order!.id,
          productId: item.productId,
          quantity: item.quantity.toString(),
          itemPrice: productData.data.find((p: any) => p.productId === item.productId).productPrice.toString(),
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


/**
 * Get details of an order by ID
 * GET /orders/:id
 */
export const getOrder = async(req: Request, res: Response) => {
  const orderId = req.params.id as string;
  // Logic to get an order by ID
  try {

    const orderDetails = await db
      .select({
        id: orders.id,
        status: orders.orderStatus,
        items: sql`
          json_agg(order_items.*)
          FILTER (WHERE order_items.id IS NOT NULL)
        `
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.isDeleted, false)
        )
      )
      .groupBy(orders.id);


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


/**
 * Get all orders for a specific user
 * GET /orders/user/:userId
 */
export const getUserOrders = async(req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const { offset = 1, limit = 10 } = req.query;
  const page = parseInt(offset as string, 10) || 1;
  const size = parseInt(limit as string, 10) || 10;
  const skip = (page - 1) * size;
  // Logic to get all orders for a specific user
  try {
    if (!userId || !validate(userId)) {
      return res.status(400).json({
        message: 'Invalid userId',
        status: 'error',
      });
    }

    const totalOrdersCount = await db.select({count : count()})
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.isDeleted, false)));
    
    console.log(`Total orders count for user ${userId} :`, totalOrdersCount[0]?.count);
    
    const userOrders = await db.select({
      orderId: orders.id,
      orderStatus: orders.orderStatus,
      orderPrice: orders.orderPrice,
      createdAt: orders.createdAt,

      address: {
        street: orders.orderAddress,
        city: orders.orderCity,
        state: orders.orderState,
        country: orders.orderCountry,
        zip: orders.orderZip,
      }
    })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.isDeleted, false)))
      .limit(size)
      .offset(skip);

    res.status(200).json({ 
      message: `Orders for User ID: ${userId}`,
      status: "success",
      data: userOrders,
      pagination: {
        currentPage: page,
        pageSize: size,
        totalRecords: totalOrdersCount[0]?.count || 0,
      },
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

export const getOrderStats = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  try {
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required",
        status: "error"
      });
    }

    // Validate date format
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid date format",
        status: "error"
      });
    }

    if (start > end) {
      return res.status(400).json({
        message: "startDate cannot be after endDate",
        status: "error"
      });
    }

    // Fetch orders
    const stats = await db.select()
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, start),
          lte(orders.createdAt, end),
          eq(orders.isDeleted, false)
        )
      );

    // Calculate statistics
    const totalOrders = stats.length;
    const totalRevenue = stats.reduce((acc, curr) => 
      acc + parseFloat(curr.orderPrice.toString()), 0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const completedOrders = stats.filter(stat => 
      stat.orderStatus === ORDER_STATUS_DELIVERED
    ).length;
    const pendingOrders = stats.filter(stat => 
      stat.orderStatus === ORDER_STATUS_CREATED
    ).length;
    const cancelledOrders = stats.filter(stat => 
      stat.orderStatus === ORDER_STATUS_CANCELLED
    ).length;

    res.status(200).json({ 
      message: `Order stats from ${startDate} to ${endDate}`,
      status: "success",
      data: {
        overview: {
          totalOrders,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
          completedOrders,
          pendingOrders,
          cancelledOrders,
        }
      }, 
    });

  } catch (error) {
    console.error("Error fetching order stats:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: "error",
      trace: error,
    });
  }
}



/**
 * Get all the orders in the platform with pagination
 * GET /orders/list
 */
export const listOrders = async (req: Request, res: Response) => {
  const { offset = 1, limit = 10 } = req.query;
  const page = parseInt(offset as string, 10) || 1;
  const size = parseInt(limit as string, 10) || 10;
  const skip = (page - 1) * size;

  try {
    const allOrders = await db.select()
      .from(orders)
      .where(eq(orders.isDeleted, false));

    const totalOrdersCount = await db.select({count : count()})
      .from(orders)
      .where(eq(orders.isDeleted, false));
    
    res.status(200).json({ 
      message: `List of all orders`,
      status: "success",
      data: allOrders,
      pagination: {
        currentPage: page,
        pageSize: size,
        totalRecords: totalOrdersCount[0]?.count || 0,
      },
    });

  } catch (error) {
    console.error("Error listing orders:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: "error",
      trace: error,
    });
  }
}




/**
 * Update order status
 * PATCH /orders/:id  Req Body: { status: number }
 */
export const updateOrderStatus = async (req: Request, res: Response) => {
  const orderId = req.params.id as string;
  const { status } = req.body;
  
  const validStatusCodes = [
    { code: ORDER_STATUS_CREATED, name: 'Created' },
    { code: ORDER_STATUS_PAID, name: 'Paid' },
    { code: ORDER_STATUS_SHIPPED, name: 'Shipped' },
    { code: ORDER_STATUS_DELIVERED, name: 'Delivered' },
    { code: ORDER_STATUS_CANCELLED, name: 'Cancelled' },
  ];

  try {

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
        status: "error"
      });
    }

    if (!validStatusCodes.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatusCodes.map(s => s.name).join(', ')}`,
        status: "error"
      });
    }

    const existingOrder = await db.select({orderId: orders.id, currentStatus: orders.orderStatus})
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          eq(orders.id, orderId),
        )
      )
      .limit(1);

    if (existingOrder.length === 0) {
      return res.status(404).json({
        message: "Order not found",
        status: "error"
      });
    }

    const updatedOrder = await db.update(orders)
      .set({
        orderStatus: status,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    res.status(200).json({
      message: `Order status updated to ${validStatusCodes.find(s => s.code === status)?.name}`,
      status: "success",
      data: updatedOrder[0]
    });

  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: "error",
      trace: error,
    });
  }
}




/**
 * Delete an order (soft delete)
 * DELETE /orders/:id
 */
export const deleteOrder = async (req: Request, res: Response) => {
  const orderId = req.params.id as string;

  try {
    // Logic to delete an order
    const updatedOrder = await db.update(orders)
      .set({
        isDeleted: true,
        orderStatus: ORDER_STATUS_CANCELLED,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    res.status(200).json({ 
      message: `Order ID: ${orderId} deleted successfully`,
      data: updatedOrder[0],
      status: "success",
    });

  } catch (error) {
    
    console.error("Error deleting order:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: "error",
      trace: error,
    });
  }
}