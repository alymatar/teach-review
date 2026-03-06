## Tech Reviews Backend (Microservices)

This project is a microservices-based backend for a tech product feedback platform. It consists of:

- **API Gateway** (`gateway`): Single entry point, JWT validation, simple rate limiting, and routing.
- **Auth Service** (`auth-service`): User registration, login, and **stateless** JWT access + refresh tokens (refresh tokens are **not** stored in the database).
- **Product Service** (`product-service`): Product CRUD, file-based image upload, and user reviews with automatic average rating calculation.

### Quick start (Docker)

1. Make sure Docker and Docker Compose are installed.
2. From the project root, run:

```bash
docker compose up --build
```

3. Services:
   - Gateway: `http://localhost:8080`
   - **Swagger UI (Gateway)**: `http://localhost:8080/api-docs`
   - Auth service: `http://localhost:4001` (Swagger: `/docs`)
   - Product service: `http://localhost:4002` (Swagger: `/docs`)
   - Auth Postgres: `localhost:5433`
   - Product Postgres: `localhost:5434`

### Auth flow (no DB-stored refresh tokens)

- `POST /api/auth/register` – create a user, returns `accessToken` (15 min) and `refreshToken` (7 days).
- `POST /api/auth/login` – login by email or username, returns new tokens.
- `POST /api/auth/refresh` – takes a `refreshToken`, verifies it with the refresh secret, and issues **new** access and refresh tokens.
- Refresh tokens are **pure JWTs** signed with `JWT_REFRESH_SECRET`; they are **not persisted or tracked** in the database.

### Product & review flow (via gateway)

- Public:
  - `GET /api/products`
  - `GET /api/products/:id`
  - `GET /api/products/:id/reviews`
- Authenticated:
  - `POST /api/products/:id/reviews` – create a review (rating 1–5, comment optional).
- Admin (role enforced at gateway):
  - `POST /api/products` – create product.
  - `POST /api/products/:id/image` – upload product image (multipart, field name `image`).

This scaffold is intended as a starting point; you can extend it with full Swagger/OpenAPI docs, more CRUD operations, and stronger validation as needed.

