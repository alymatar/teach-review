import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./swagger";

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const port = process.env.PORT || 8080;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:4002";
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev_access_secret";

interface JwtPayload {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Simple rate limiter (per-process, in-memory, for demo only)
const rateLimitWindowMs = 60_000;
const rateLimitMax = 100;
const clientRequests = new Map<string, { count: number; start: number }>();

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  const now = Date.now();
  const record = clientRequests.get(key);

  if (!record || now - record.start > rateLimitWindowMs) {
    clientRequests.set(key, { count: 1, start: now });
    return next();
  }

  record.count += 1;
  if (record.count > rateLimitMax) {
    return res.status(429).json({ message: "Too many requests" });
  }

  return next();
}

app.use(rateLimiter);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(role: "USER" | "ADMIN") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

// Auth routes (proxied to Auth Service)
app.post("/api/auth/register", async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Auth service unavailable" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Auth service unavailable" });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/refresh`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Auth service unavailable" });
  }
});

// Product routes
app.get("/api/products", async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/products`, {
      params: req.query,
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Product service unavailable" });
  }
});

app.get("/api/products/:id/reviews", async (req, res) => {
  try {
    const response = await axios.get(
      `${PRODUCT_SERVICE_URL}/products/${req.params.id}/reviews`
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Product service unavailable" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/products/${req.params.id}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Product service unavailable" });
  }
});

app.put("/api/products/:id", authenticateJWT, requireRole("ADMIN"), async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const response = await axios.put(
      `${PRODUCT_SERVICE_URL}/products/${req.params.id}`,
      req.body,
      {
        headers: {
          "x-user-id": user.sub,
          "x-user-role": user.role,
        },
      }
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Product service unavailable" });
  }
});

app.delete("/api/products/:id", authenticateJWT, requireRole("ADMIN"), async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const response = await axios.delete(
      `${PRODUCT_SERVICE_URL}/products/${req.params.id}`,
      {
        headers: {
          "x-user-id": user.sub,
          "x-user-role": user.role,
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Product service unavailable" });
  }
});

app.post(
  "/api/products/:id/image",
  authenticateJWT,
  requireRole("ADMIN"),
  upload.single("image"),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      if (!req.file) {
        return res.status(400).json({ message: "image file is required" });
      }
      const form = new FormData();
      form.append("image", req.file.buffer, {
        filename: req.file.originalname || "image",
        contentType: req.file.mimetype,
      });
      const response = await axios.post(
        `${PRODUCT_SERVICE_URL}/products/${req.params.id}/image`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            "x-user-id": user.sub,
            "x-user-role": user.role,
          },
          maxBodyLength: Infinity,
        }
      );
      res.status(response.status).json(response.data);
    } catch (error: any) {
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      res.status(500).json({ message: "Product service unavailable" });
    }
  }
);

app.post(
  "/api/products/:id/images",
  authenticateJWT,
  requireRole("ADMIN"),
  upload.array("images", 10),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "at least one image file is required" });
      }

      const form = new FormData();
      files.forEach((file) => {
        form.append("images", file.buffer, {
          filename: file.originalname || "image",
          contentType: file.mimetype,
        });
      });

      const response = await axios.post(
        `${PRODUCT_SERVICE_URL}/products/${req.params.id}/images`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            "x-user-id": user.sub,
            "x-user-role": user.role,
          },
          maxBodyLength: Infinity,
        }
      );

      res.status(response.status).json(response.data);
    } catch (error: any) {
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      res.status(500).json({ message: "Product service unavailable" });
    }
  }
);

app.get("/api/products/:id/images", async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/products/${req.params.id}/images`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Product service unavailable" });
  }
});

app.delete(
  "/api/products/images/:imageId",
  authenticateJWT,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const response = await axios.delete(
        `${PRODUCT_SERVICE_URL}/products/images/${req.params.imageId}`,
        {
          headers: {
            "x-user-id": user.sub,
            "x-user-role": user.role,
          },
        }
      );
      res.status(response.status).send(response.data);
    } catch (error: any) {
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      res.status(500).json({ message: "Product service unavailable" });
    }
  }
);

app.post("/api/products", authenticateJWT, requireRole("ADMIN"), async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const response = await axios.post(
      `${PRODUCT_SERVICE_URL}/products`,
      req.body,
      {
        headers: {
          "x-user-id": user.sub,
          "x-user-role": user.role,
        },
      }
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Product service unavailable" });
  }
});

app.post("/api/products/:id/reviews", authenticateJWT, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const response = await axios.post(
      `${PRODUCT_SERVICE_URL}/products/${req.params.id}/reviews`,
      req.body,
      {
        headers: {
          "x-user-id": user.sub,
          "x-user-role": user.role,
        },
      }
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "Product service unavailable" });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API Gateway listening on port ${port}`);
});

