import { integer, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";


export const order  = pgTable("order", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  orderDate: timestamp("order_date").notNull(),
  orderStatus: uuid("order_status").notNull(),
  orderPrice: numeric("order_price").notNull(),
  orderAddress: uuid("order_address").notNull(),
  orderCity: uuid("order_city").notNull(),
  orderState: uuid("order_state").notNull(),
  orderCountry: uuid("order_country").notNull(),
  orderZip: uuid("order_zip").notNull(),
  orderEmail: uuid("order_email").notNull(),
  orderTax: integer("order_tax").notNull(),
});


export const orderItem  = pgTable("order_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: numeric("quantity").notNull(),
  itemPrice: numeric("item_price").notNull(),
});

export const orderStatus  = pgTable("order_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  statusName: uuid("status_name").notNull(),
});