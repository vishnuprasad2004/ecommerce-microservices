import { Request, Response } from "express";
import { db } from "../db.js";
import { orders, orderItems } from "../schema.js";
import logger, { logError } from "../utils/logger.js";

import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { validate } from "uuid";

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

// ADD THIS
logger.info('🎯 Order Controller Initialized:');
logger.info('  PRODUCT_SERVICE_URL:', PRODUCT_SERVICE_URL);
logger.info('  USER_SERVICE_URL:', USER_SERVICE_URL);

const ORDER_STATUS_CREATED = 1;
const ORDER_STATUS_PAID = 2;
const ORDER_STATUS_SHIPPED = 3;
const ORDER_STATUS_DELIVERED = 4;
const ORDER_STATUS_CANCELLED = 5;

export const VALID_ORDER_STATUS = [
  { code: ORDER_STATUS_CREATED, name: "Created" },
  { code: ORDER_STATUS_PAID, name: "Paid" },
  { code: ORDER_STATUS_SHIPPED, name: "Shipped" },
  { code: ORDER_STATUS_DELIVERED, name: "Delivered" },
  { code: ORDER_STATUS_CANCELLED, name: "Cancelled" },
] as const;

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


type AvailableProduct = {
  productId: string;
  productPrice: number; 
  productStock: number; 
  productName: string;
  productSKU: string;
}


/**
 * Create a new order
 * POST /orders/
 */
export const createOrder = async (req: Request, res: Response) => {
  //transactional logic to create order and order items
  // get all the information from req.body
  logger.info("[CREATE ORDER] Received create order request with body:", req.body);
  const { email, items, orderTax, phone, userId, shippingAddress, shippingAddressId }: CreateOrderRequest = req.body;
  
  if (!userId || !items || items.length === 0) {
    logger.warn("[CREATE ORDER] Bad Request, Missing fields - userId and/or items are missing.", {});
    return res.status(400).json({
      message: 'userId and items are required',
      success: false
    });
  }

  if (!shippingAddressId && !shippingAddress) {
    logger.warn("[CREATE ORDER] Bad Request, Either shippingAddressId or shippingAddress is required.", {});
    return res.status(400).json({
      message: 'Either shippingAddressId or shippingAddress is required',
      success: false,
    });
  }

  try {

    //validate the user and the shipping address here
    logger.info(`[CREATE ORDER] Validating user with ID: ${userId} and shipping address with ID: ${shippingAddressId}`);
    const userResponse = await fetch(`${USER_SERVICE_URL}/api/users/${userId}`);
    logger.info(`[CREATE ORDER] User validation response :`, userResponse.body);
    
    if(userResponse.status !== 200) {
      logger.warn("[CREATE ORDER] Invalid userId when creating a order.")
      return res.status(400).json({
        message: 'Invalid userId, Please Try Again',
        success: false,
      });
    }

    const address = shippingAddress || await (async () => {
      logger.info(`[CREATE ORDER] Validating shipping address with ID: ${shippingAddressId}`);
      const res = await fetch(`${USER_SERVICE_URL}/api/address/${shippingAddressId}`);
      logger.info(`[CREATE ORDER] Address validation response :`, res);
      if(res.status !== 200) {
        throw new Error('Invalid shippingAddressId');
      }
      return res.json();
    })();

    // check for product availability and get product prices -> for this I made a bulk fetch POST API in product-service
    logger.info(`[CREATE ORDER] Checking availability for items: ${items.map(i => i.productId).join(', ')}`);
    
    const productAvailabilityResponse = await fetch(`${PRODUCT_SERVICE_URL}/api/products/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemIds: items.map(item => item.productId),
      }),
    });

    logger.info(`[CREATE ORDER] Product availability response :`, productAvailabilityResponse);
    if (productAvailabilityResponse.status !== 200) {
      return res.status(400).json({
        message: 'Error checking product availability',
        success: false,
      });
    }
    
    const productData = await productAvailabilityResponse.json();
    logger.info(`[CREATE ORDER] Product data :`, {productData: productData.data});

    // calculate the total price with tax, discounts, shippingcost and coupons ... for now only total price and static tax value
    let subtotal = 0;
    
    for (const item of items) {
      const product: AvailableProduct = productData.data.find((p: any) => p.productId === item.productId);

      logger.info(`[CREATE ORDER] Product for item ${item.productId} :`, product);
      if (!product || product.productStock < item.quantity) {
        return res.status(400).json({
          message: `Product ${item.productId} is out of stock or insufficient quantity`,
          success: false,
        });
      }
      subtotal += product.productPrice * item.quantity;
    }

    let tax = Number(orderTax) || 0; // for now assuming there are no shipping/handling charges and no coupon/discount sys available
    let orderPrice = subtotal + (subtotal * tax) / 100;

    const orderStatus = 1;
    
    // deduce the stock by calling the product-service
    try {
      logger.info(`[CREATE ORDER] Deducting stock for items: ${items.map(i => i.productId).join(', ')}`, {items: items.map(i => i.productId)});

      const stockUpdateResponse = await fetch(`${PRODUCT_SERVICE_URL}/api/products/deduct-stock`, {
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
      logger.info(`[CREATE ORDER] Stock update response :`, stockUpdateResponse);

      if (stockUpdateResponse.status !== 200) {
        return res.status(400).json({
          message: 'Error updating product stock',
          success: false,
        });
      }
    
    // unable to deduct the product stock in product-service
    } catch (error) {
      logError("[CREATE ORDER] Error updating product stock", error, {
        body: req.body,
        productAvailability: productData.data
      });
      return res.status(500).json({
        message: 'Failed to reserve products. Please try again.',
        success: false,
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
    }).then((order) => {
      logger.info("[CREATE ORDER] Inserted the data into the db", {orderId: order?.id});
    });
    // insert into order items table with the order id
    // return the created order details

    res.status(201).json({
      message: "Order created successfully",
      success: true,
      data: newOrder,
    });

  // global error handling for this method
  } catch (error) { 

    /**
     * TODO: Implement a compensation mechanism to handle failures after stock deduction, such as:
     * - Rolling back stock deductions if order creation fails
     * - Sending notifications to admins about failed orders
     * - Implementing a retry mechanism for failed stock updates
     * There are 2 approaches to handle this: (topic is called distributed transactions in microservices)
     * 1. 2 phase commit 
     * 2. Saga pattern 
     * For now, I only know the names of these patterns, I will have to research and learn about them to implement a proper solution. For now, I will just log the error and return a 500 response.
     */
    logError("Error creating order:", error, {
      body: req.body
    });
    res.status(500).json({
      message: "Internal Server Error",
      success: false,
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

    if (!orderId || !validate(orderId)) {
      return res.status(400).json({
        message: 'Invalid userId',
        success: false,
      });
    }

    const orderDetails: any = await db
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

    // order not found
    if (!orderDetails || orderDetails.length === 0) {
      logger.warn("Order not found", { orderId });

      return res.status(404).json({
        message: "Order not found",
        success: false,
      });
    }

    logger.info("Order fetched successfully", {
      orderId,
      itemCount: orderDetails[0]?.items?.length || 0,
    });

    res.status(200).json({ 
      message: `Order details for ID: ${orderId}`,
      success: true,
      data: orderDetails,
    });
  
  } catch (error) {
    logError("Error when fetching a order bt orderId", error, {
      orderId,
      route: req.path,
    })
    res.status(500).json({
      message: "Internal Server Error",
      success: false,
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
      logger.warn("Invalid userId received", { userId });
      return res.status(400).json({
        message: 'Invalid userId',
        success: false,
      });
    }

    const totalOrdersCount = await db.select({count : count()})
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.isDeleted, false)));

    const totalRecords = totalOrdersCount[0]?.count || 0;
    
    logger.info(`Total orders count for user ${userId} :`, totalOrdersCount[0]?.count);
    
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

    if (userOrders.length === 0) {
      logger.warn("No orders found for user", { userId });

      return res.status(404).json({
        message: "No orders found for this user",
        success: true,
        data: [],
      });
    }

    logger.info("User orders fetched successfully", {
      userId,
      totalFetched: userOrders.length,
      totalRecords,
    });
    res.status(200).json({ 
      message: `Orders for User ID: ${userId}`,
      success: true,
      data: userOrders,
      pagination: {
        currentPage: page,
        pageSize: size,
        totalRecords: totalOrdersCount[0]?.count || 0,
      },
    });
  } catch (error) {
    logError("Error fetching the user orders", error, {
      userId,
      route: req.path,
    })
    res.status(500).json({
      message: "Internal Server Error",
      success: false
    });
  }
}

/**
 * Get order stats
 * GET /orders/stats
 */
export const getOrderStats = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  try {
    // Validate required parameters
    if (!startDate || !endDate) {
      logger.warn("Missing date range params", { startDate, endDate });
      return res.status(400).json({
        message: "startDate and endDate are required",
        success: false
      });
    }

    // Validate date format
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      logger.warn("Invalid date format", { startDate, endDate });
      return res.status(400).json({
        message: "Invalid date format",
        success: false
      });
    }

    if (start > end) {
      logger.warn("Invalid date range (start > end)", { startDate, endDate });

      return res.status(400).json({
        message: "startDate cannot be after endDate",
        success: false,
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
    
    logger.info("Orders fetched for stats", {
      count: stats.length,
    });

    // Calculate statistics
    const totalOrders = stats.length;
    const totalRevenue = stats.reduce((acc, curr) => 
      acc + Number(curr.orderPrice.toString()), 0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const orderSummary = {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
    };

    stats.forEach((stat) => {
      orderSummary.totalOrders++;

      orderSummary.totalRevenue += Number(stat.orderPrice);

      switch (stat.orderStatus) {
        case ORDER_STATUS_DELIVERED:
          orderSummary.completedOrders++;
          break;

        case ORDER_STATUS_CREATED:
          orderSummary.pendingOrders++;
          break;

        case ORDER_STATUS_CANCELLED:
          orderSummary.cancelledOrders++;
          break;
      }
    });
    
    logger.info("Order stats computed successfully", {
      startDate,
      endDate,
      totalOrders,
    });

    res.status(200).json({ 
      message: `Order stats from ${startDate} to ${endDate}`,
      success: true,
      data: {
        overview: {
          totalOrders,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
          completedOrders: orderSummary.completedOrders,
          pendingOrders: orderSummary.pendingOrders,
          cancelledOrders: orderSummary.cancelledOrders,
        }
      }, 
    });

  } catch (error) {
    logError("Error fetching order stats", error, {
      route: req.path
    })
    res.status(500).json({
      message: "Internal Server Error",
      success: false,
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
    const allOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.isDeleted, false))
      .limit(size)
      .offset(skip);

    const totalOrdersCount = await db.select({count : count()})
      .from(orders)
      .where(eq(orders.isDeleted, false))
      .limit(size)
      .offset(skip);

    logger.info("Orders fetched successfully", {
      fetched: allOrders.length,
      totalRecords: totalOrdersCount[0]?.count || 0,
      page,
    });
    
    res.status(200).json({ 
      message: `List of all orders`,
      success: true,
      data: allOrders,
      pagination: {
        currentPage: page,
        pageSize: size,
        totalRecords: totalOrdersCount[0]?.count || 0,
      },
    });

  } catch (error) {
    logError("Error listing orders", error, {
      route: req.path,
      page,
      size,
    });
    res.status(500).json({
      message: "Internal Server Error",
      success: false
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
  

  try {

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
        success: false
      });
    }
    const statusCode = parseInt(status, 10);
    if (isNaN(statusCode) ||!isValidStatus(statusCode)) {
      logger.warn("Invalid status code received", { statusCode });
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${VALID_ORDER_STATUS.map(s => s.name).join(', ')}`,
        success: false
      });
    }

    // const existingOrder = await db.select({orderId: orders.id, currentStatus: orders.orderStatus})
    //   .from(orders)
    //   .where(
    //     and(
    //       eq(orders.isDeleted, false),
    //       eq(orders.id, orderId),
    //     )
    //   )
    //   .limit(1);

    // if (existingOrder.length === 0) {
    //   return res.status(404).json({
    //     message: "Order not found",
    //     success: false
    //   });
    // }

    const updatedOrder = await db.update(orders)
      .set({
        orderStatus: statusCode,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

      if (updatedOrder.length === 0) {
        logger.warn("Order not found for status update", { orderId });

        return res.status(404).json({
          message: "Order not found",
          success: false,
        });
      }

    const statusName = getStatusName(statusCode);

    logger.info("Order status updated successfully", {
      orderId,
      statusCode,
      statusName,
    });

    res.status(200).json({
      message: `Order status updated to ${statusName}`,
      success: true,
      data: updatedOrder[0]
    });

  } catch (error) {
    logError("Error updating order status", error, {
      orderId,
      status,
      route: req.path,
    });

    res.status(500).json({
      message: "Internal Server Error",
      success: false
    });
  }
}

// helper functions for the above method

const getStatusName = (code: number) => VALID_ORDER_STATUS.find((s) => s.code === code)?.name;

const isValidStatus = (code: number) => VALID_ORDER_STATUS.some((s) => s.code === code);




/**
 * Delete an order (soft delete)
 * DELETE /orders/:id
 */
export const deleteOrder = async (req: Request, res: Response) => {
  const orderId = req.params.id as string;

  try {
    if (!orderId || !validate(orderId)) {
      logger.warn("Invalid orderId provided for deletion", { orderId });

      return res.status(400).json({
        message: "Invalid orderId",
        success: false,
      });
    }
    // Logic to delete an order
    const updatedOrder = await db.update(orders)
      .set({
        isDeleted: true,
        orderStatus: ORDER_STATUS_CANCELLED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.isDeleted, false)
      ))
      .returning();

    if (!updatedOrder.length) {
      logger.warn("Order not found or already deleted", { orderId });

      return res.status(404).json({
        message: "Order not found",
        success: false,
      });
    }

    logger.info("Order soft deleted successfully", {
      orderId,
      newStatus: ORDER_STATUS_CANCELLED,
    });

    res.status(200).json({ 
      message: `Order ID: ${orderId} deleted successfully`,
      data: updatedOrder[0],
      success: true,
    });

  } catch (error) {
    logError("Error deleting order", error, {
      orderId,
      route: req.path,
    });
    res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
}