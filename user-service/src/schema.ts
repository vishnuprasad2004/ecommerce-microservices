import { sql } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";


export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  phone: text("phone").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  role: integer("role").notNull().default(1).references(() => roles.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
},(table) => ([
  uniqueIndex("unique_credentials").on(table.email, table.phone)
]));



export const address = pgTable("address", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  street: text("street").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ([
  sql`CHECK (zip_code ~ '^[1-9][0-9]{5}$')`,
]));

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  roleName: text("role_name").notNull().unique(),
});


// export const creditCardTypeEnum = pgEnum("credit_debit",["CREDIT", "DEBIT"]);

// Billing Information Table -> only considers credit card details for simplicity
// export const billingInfo = pgTable("billing_info", {
//   id: uuid("id").primaryKey().defaultRandom(),
//   userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
//   cardType: creditCardTypeEnum("card_type").notNull(),
//   // these will be stored encrypted
//   // use applications like stripe to store cause it follows PCI (Payment Card Industry) compliance
//   cardNumber: text("card_number").notNull(),
//   cardHolderName: text("card_holder_name").notNull(),
//   expirationDate: timestamp("expiration_date").notNull(),
//   cvv: text("cvv").notNull(),
//   createdAt: timestamp("created_at").notNull().defaultNow(),
// });


// NOTE: the contraints and indexes are added in array format as per new Drizzle ORM API requirements














/**
SQL Code for the above pgTables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  role INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_role
    FOREIGN KEY (role)
    REFERENCES roles(id)
);

CREATE UNIQUE INDEX unique_credentials
ON users (email, phone);

CREATE TABLE address (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_address_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT zip_code_check
    CHECK (zip_code ~ '^[1-9][0-9]{5}$')
);


INSERT INTO roles (id, role_name) VALUES
  (1, 'USER'),
  (2, 'ADMIN'),
  (3, 'SELLER');

SELECT * FROM roles;


For production, utilize drizzle-kit fully cmds like generate, migrate, push
 */