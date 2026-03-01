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

// Reviews
app.get("/products/:id/reviews", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT id, product_id, user_id, rating, comment, created_at, updated_at
        FROM reviews
        WHERE product_id = $1
        ORDER BY created_at DESC
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

