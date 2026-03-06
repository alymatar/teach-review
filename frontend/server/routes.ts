import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { randomUUID } from "crypto";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev_access_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

const uploadsRoot = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, uploadsRoot);
    },
    filename(_req, file, cb) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
  }),
});

async function ensureProductImagesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id UUID PRIMARY KEY,
      product_id UUID NOT NULL,
      image_path TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function signAccessToken(user: any) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(user: any) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

function authenticateJWT(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await ensureProductImagesTable();
  app.use('/uploads', express.static(uploadsRoot));

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingEmail = await storage.getUserByEmail(input.email);
      const existingUsername = await storage.getUserByUsername(input.username);
      
      if (existingEmail || existingUsername) {
        return res.status(409).json({ message: "Email or username already in use" });
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
      const userRole = input.role === "ADMIN" ? "ADMIN" : "USER";
      
      const user = await storage.createUser({
        email: input.email,
        username: input.username,
        passwordHash,
        role: userRole,
      });

      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);

      res.status(201).json({ user, accessToken, refreshToken });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      let user = await storage.getUserByEmail(input.emailOrUsername);
      if (!user) {
        user = await storage.getUserByUsername(input.emailOrUsername);
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);

      res.json({ user, accessToken, refreshToken });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.refresh.path, async (req, res) => {
    try {
      const input = api.auth.refresh.input.parse(req.body);
      const decoded: any = jwt.verify(input.refreshToken, JWT_REFRESH_SECRET);
      
      const user = await storage.getUser(decoded.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const newAccessToken = signAccessToken(user);
      const newRefreshToken = signRefreshToken(user);

      res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
      res.status(401).json({ message: "Invalid or expired refresh token" });
    }
  });

  app.get(api.products.list.path, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const products = await storage.getProducts({
        category: req.query.category as string,
        search: req.query.search as string,
        page,
        limit,
      });
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.products.create.path, authenticateJWT, requireRole("ADMIN"), async (req: any, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.products.update.path, authenticateJWT, requireRole("ADMIN"), async (req: any, res) => {
    try {
      const input = api.products.update.input.parse(req.body);
      const existing = await storage.getProduct(req.params.id);

      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }

      const product = await storage.updateProduct(req.params.id, input);
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.products.delete.path, authenticateJWT, requireRole("ADMIN"), async (req: any, res) => {
    try {
      const existing = await storage.getProduct(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }

      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.products.uploadImage.path, authenticateJWT, requireRole("ADMIN"), upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "image file is required" });
      }
      const imagePath = `/uploads/${req.file.filename}`;
      const product = await storage.updateProductImage(req.params.id, imagePath);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(
    api.products.uploadImages.path,
    authenticateJWT,
    requireRole("ADMIN"),
    upload.array("images", 10),
    async (req: any, res) => {
      try {
        const files = (req.files as any[]) || [];

        if (!files.length) {
          return res.status(400).json({ message: "at least one image file is required" });
        }

        const inserted: any[] = [];

        for (const file of files) {
          const id = randomUUID();
          const imagePath = `uploads/${file.filename}`;

          const result = await pool.query(
            `
              INSERT INTO product_images (id, product_id, image_path)
              VALUES ($1, $2, $3)
              RETURNING id, product_id AS "productId", image_path AS "imagePath", created_at AS "createdAt"
            `,
            [id, req.params.id, imagePath],
          );

          inserted.push(result.rows[0]);
        }

        const firstFile = files[0];
        if (firstFile) {
          await pool.query(
            `
              UPDATE products
              SET image_path = COALESCE(image_path, $1)
              WHERE id = $2 AND image_path IS NULL
            `,
            [`/uploads/${firstFile.filename}`, req.params.id],
          );
        }

        res.status(201).json(inserted);
      } catch (err) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get(api.products.listImages.path, async (req, res) => {
    try {
      const result = await pool.query(
        `
          SELECT id,
                 product_id AS "productId",
                 image_path AS "imagePath",
                 created_at AS "createdAt"
          FROM product_images
          WHERE product_id = $1
          ORDER BY created_at DESC
        `,
        [req.params.id],
      );

      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(
    api.products.deleteImage.path,
    authenticateJWT,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const existing = await pool.query(
          `
            SELECT image_path
            FROM product_images
            WHERE id = $1
          `,
          [req.params.imageId],
        );

        if (existing.rowCount === 0) {
          return res.status(404).json({ message: "Image not found" });
        }

        const imagePath: string = existing.rows[0].image_path;

        await pool.query(
          `
            DELETE FROM product_images
            WHERE id = $1
          `,
          [req.params.imageId],
        );

        try {
          const relativePath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
          const absolutePath = path.join(process.cwd(), relativePath);
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
          }
        } catch (fileErr) {
          // eslint-disable-next-line no-console
          console.error("Failed to delete image file from disk:", fileErr);
        }

        res.status(204).send();
      } catch (err) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get(api.products.listReviews.path, async (req, res) => {
    try {
      const reviews = await storage.getReviews(req.params.id);
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.products.createReview.path, authenticateJWT, async (req: any, res) => {
    try {
      const input = api.products.createReview.input.parse(req.body);
      const review = await storage.createReview({
        productId: req.params.id,
        userId: req.user.sub,
        rating: input.rating,
        comment: input.comment,
      });
      res.status(201).json(review);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
