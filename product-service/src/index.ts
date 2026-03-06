import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import multer from "multer";
import { swaggerDocument } from "./swagger";
import path from "path";
import fs from "fs";
import { Pool } from "pg";

const app = express();
const port = process.env.PORT || 4002;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://product_user:product_password@localhost:5434/product_db";

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      image_path TEXT,
      avg_rating NUMERIC(2,1) NOT NULL DEFAULT 0.0,
      rating_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_path TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function recalculateProductRating(productId: string) {
  const result = await pool.query<{ avg: string; count: string }>(
    `
      SELECT COALESCE(AVG(rating), 0) AS avg, COUNT(*) AS count
      FROM reviews
      WHERE product_id = $1
    `,
    [productId]
  );

  const row = result.rows[0];
  const avg = parseFloat(row.avg || "0");
  const count = parseInt(row.count || "0", 10);

  await pool.query(
    `
      UPDATE products
      SET avg_rating = $1,
          rating_count = $2,
          updated_at = NOW()
      WHERE id = $3
    `,
    [avg, count, productId]
  );
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Image upload configuration
const uploadsRoot = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadsRoot);
  },
  filename(_req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Public product endpoints
app.get("/products", async (req: Request, res: Response) => {
  const { category, search, page = "1", limit = "10" } = req.query as {
    category?: string;
    search?: string;
    page?: string;
    limit?: string;
  };

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const values: any[] = [];

  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `
        SELECT id, name, description, category, image_path, avg_rating, rating_count, created_at, updated_at
        FROM products
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
      `,
      [...values, limitNum, offset]
    );

    res.json(result.rows);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in GET /products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT id, name, description, category, image_path, avg_rating, rating_count, created_at, updated_at
        FROM products
        WHERE id = $1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in GET /products/:id:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Admin-only product creation (gateway enforces role)
app.post("/products", async (req: Request, res: Response) => {
  const { name, description, category } = req.body as {
    name?: string;
    description?: string;
    category?: string;
  };

  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO products (name, description, category)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, category, image_path, avg_rating, rating_count, created_at, updated_at
      `,
      [name, description ?? null, category ?? null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in POST /products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Admin-only product update (gateway enforces role)
app.put("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, category } = req.body as {
    name?: string;
    description?: string;
    category?: string;
  };

  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  try {
    const result = await pool.query(
      `
        UPDATE products
        SET name = $1,
            description = $2,
            category = $3,
            updated_at = NOW()
        WHERE id = $4
        RETURNING id, name, description, category, image_path, avg_rating, rating_count, created_at, updated_at
      `,
      [name, description ?? null, category ?? null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in PUT /products/:id:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Admin-only product delete (gateway enforces role)
app.delete("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
        DELETE FROM products
        WHERE id = $1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(204).send();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in DELETE /products/:id:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Image upload
app.post(
  "/products/:id/image",
  upload.single("image"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "image file is required" });
    }

    try {
      const relativePath = path.relative(process.cwd(), req.file.path);

      const result = await pool.query(
        `
          UPDATE products
          SET image_path = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING id, name, description, category, image_path, avg_rating, rating_count, created_at, updated_at
        `,
        [relativePath, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      return res.json(result.rows[0]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error in POST /products/:id/image:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Multiple images upload
app.post(
  "/products/:id/images",
  upload.array("images", 10),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "at least one image file is required" });
    }

    try {
      const values: any[] = [];
      const placeholders: string[] = [];

      files.forEach((file, index) => {
        const relativePath = path.relative(process.cwd(), file.path);
        values.push(id, relativePath);
        const baseIndex = index * 2;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2})`);
      });

      const insertResult = await pool.query(
        `
          INSERT INTO product_images (product_id, image_path)
          VALUES ${placeholders.join(", ")}
          RETURNING id, product_id AS "productId", image_path AS "imagePath", created_at AS "createdAt"
        `,
        values
      );

      const firstPath = path.relative(process.cwd(), files[0].path);
      await pool.query(
        `
          UPDATE products
          SET image_path = COALESCE(image_path, $1),
              updated_at = NOW()
          WHERE id = $2 AND image_path IS NULL
        `,
        [firstPath, id]
      );

      return res.status(201).json(insertResult.rows);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error in POST /products/:id/images:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// List product images
app.get("/products/:id/images", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT id, product_id AS "productId", image_path AS "imagePath", created_at AS "createdAt"
        FROM product_images
        WHERE product_id = $1
        ORDER BY created_at DESC
      `,
      [id]
    );

    return res.json(result.rows);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in GET /products/:id/images:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a single product image
app.delete("/products/images/:imageId", async (req: Request, res: Response) => {
  const { imageId } = req.params;

  try {
    const existing = await pool.query(
      `
        SELECT image_path
        FROM product_images
        WHERE id = $1
      `,
      [imageId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    const imagePath = existing.rows[0].image_path as string;

    await pool.query(
      `
        DELETE FROM product_images
        WHERE id = $1
      `,
      [imageId]
    );

    try {
      const absolutePath = path.isAbsolute(imagePath)
        ? imagePath
        : path.join(process.cwd(), imagePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (fileErr) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete image file from disk:", fileErr);
    }

    return res.status(204).send();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in DELETE /products/images/:imageId:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Reviews (with username from users table)
app.get("/products/:id/reviews", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT r.id, r.product_id AS "productId", r.user_id AS "userId", r.rating, r.comment,
               r.created_at AS "createdAt", r.updated_at AS "updatedAt",
               u.username
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.product_id = $1
        ORDER BY r.created_at DESC
      `,
      [id]
    );

    return res.json(result.rows);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in GET /products/:id/reviews:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/products/:id/reviews", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rating, comment } = req.body as { rating?: number; comment?: string };
  const userId = req.header("x-user-id");

  if (!userId) {
    return res.status(401).json({ message: "Missing user id header" });
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating must be between 1 and 5" });
  }

  try {
    const insertResult = await pool.query(
      `
        INSERT INTO reviews (product_id, user_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING id, product_id, user_id, rating, comment, created_at, updated_at
      `,
      [id, userId, rating, comment ?? null]
    );

    await recalculateProductRating(id);

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in POST /products/:id/reviews:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/products/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

async function start() {
  try {
    await ensureSchema();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Product service listening on port ${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start product service:", error);
    process.exit(1);
  }
}

start();

