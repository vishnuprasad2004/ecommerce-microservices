import { boolean, integer, numeric, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";


export const orders  = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  orderStatus: integer("order_status").notNull().references(() => orderStatus.id),
  orderPrice: numeric("order_price").notNull(),
  orderAddress: text("order_address").notNull(),
  orderCity: text("order_city").notNull(),
  orderState: text("order_state").notNull(),
  orderCountry: text("order_country").notNull(),
  orderZip: text("order_zip").notNull(),
  phone: text("phone").notNull(),
  email: text("order_email").notNull(),
  orderTax: integer("order_tax").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").default(false)
});


export const orderItems  = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid("product_id").notNull(),
  quantity: numeric("quantity").notNull(),
  itemPrice: numeric("item_price").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderStatus  = pgTable("order_status", {
  id: integer("id").primaryKey(),
  statusName: text("status_name").notNull(),
});