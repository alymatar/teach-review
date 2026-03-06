import { db } from "./db";
import { users, products, reviews, type User, type Product, type Review } from "@shared/schema";
import { eq, ilike, or, and, desc } from "drizzle-orm";

export type ReviewWithUsername = Review & { username?: string | null };

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;

  getProducts(params?: { category?: string; search?: string; page?: number; limit?: number }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: any): Promise<Product>;
  updateProductImage(id: string, imagePath: string): Promise<Product | undefined>;
  updateProductRating(id: string): Promise<void>;
  deleteProduct(id: string): Promise<void>;

  getReviews(productId: string): Promise<ReviewWithUsername[]>;
  createReview(review: any): Promise<Review>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: any): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getProducts(params?: { category?: string; search?: string; page?: number; limit?: number }): Promise<Product[]> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;

    let query = db.select().from(products);
    
    const conditions = [];
    if (params?.category) conditions.push(eq(products.category, params.category));
    if (params?.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(or(ilike(products.name, searchPattern), ilike(products.description, searchPattern)));
    }
    
    let finalQuery = query.$dynamic();
    if (conditions.length > 0) {
       finalQuery = finalQuery.where(and(...conditions));
    }

    finalQuery = finalQuery.orderBy(desc(products.createdAt));

    return await finalQuery.limit(limit).offset(offset);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: any): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, update: any): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async updateProductImage(id: string, imagePath: string): Promise<Product | undefined> {
    const [updated] = await db.update(products).set({ imagePath }).where(eq(products.id, id)).returning();
    return updated;
  }

  async updateProductRating(id: string): Promise<void> {
    const allReviews = await this.getReviews(id);
    const count = allReviews.length;
    const avg = count > 0 
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / count 
      : 0;

    await db.update(products)
      .set({ avgRating: avg.toFixed(1), ratingCount: count })
      .where(eq(products.id, id));
  }

  async getReviews(productId: string): Promise<ReviewWithUsername[]> {
    const rows = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        userId: reviews.userId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        username: users.username,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, productId));
    return rows as ReviewWithUsername[];
  }

  async createReview(review: any): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    await this.updateProductRating(review.productId);
    return newReview;
  }
}

export const storage = new DatabaseStorage();
