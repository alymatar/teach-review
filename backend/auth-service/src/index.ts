import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import jwt from "jsonwebtoken";
import { swaggerDocument } from "./swagger";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const app = express();
const port = process.env.PORT || 4001;

const DATABASE_URL = process.env.DATABASE_URL || "postgres://auth_user:auth_password@localhost:5433/auth_db";
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev_access_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

type Role = "USER" | "ADMIN";

interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: Role;
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'USER',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function signAccessToken(user: User) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(user: User) {
  // Stateless refresh token: no DB persistence, only signed & time-limited
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.post("/auth/register", async (req: Request, res: Response) => {
  const { email, username, password, role } = req.body as {
    email?: string;
    username?: string;
    password?: string;
    role?: Role;
  };

  if (!email || !username || !password) {
    return res.status(400).json({ message: "email, username and password are required" });
  }

  const userRole: Role = role === "ADMIN" ? "ADMIN" : "USER";

  try {
    const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const result = await pool.query<User>(
      `
        INSERT INTO users (email, username, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, username, password_hash, role
      `,
      [email, username, hash, userRole]
    );

    const user = result.rows[0];
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email or username already in use" });
    }
    // eslint-disable-next-line no-console
    console.error("Error in /auth/register:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/auth/login", async (req: Request, res: Response) => {
  const { emailOrUsername, password } = req.body as {
    emailOrUsername?: string;
    password?: string;
  };

  if (!emailOrUsername || !password) {
    return res.status(400).json({ message: "emailOrUsername and password are required" });
  }

  try {
    const result = await pool.query<User>(
      `
        SELECT id, email, username, password_hash, role
        FROM users
        WHERE email = $1 OR username = $1
      `,
      [emailOrUsername]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in /auth/login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/auth/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      sub: string;
      email: string;
      role: Role;
    };

    const result = await pool.query<User>(
      `
        SELECT id, email, username, password_hash, role
        FROM users
        WHERE id = $1
      `,
      [decoded.sub]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in /auth/refresh:", error);
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

app.get("/auth/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

async function start() {
  try {
    await ensureSchema();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Auth service listening on port ${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start auth service:", error);
    process.exit(1);
  }
}

start();

