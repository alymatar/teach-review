import { pgTable, text, timestamp, integer, numeric, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 10 }).notNull().default("USER"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  imagePath: text("image_path"),
  avgRating: numeric("avg_rating", { precision: 2, scale: 1 }).notNull().default("0.0"),
  ratingCount: integer("rating_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull(),
  userId: uuid("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const registerRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const loginRequestSchema = z.object({
  emailOrUsername: z.string(),
  password: z.string(),
});

export const createProductRequestSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const createReviewRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Review = typeof reviews.$inferSelect;
