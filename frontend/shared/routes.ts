import { z } from 'zod';
import { registerRequestSchema, loginRequestSchema, createProductRequestSchema, createReviewRequestSchema } from './schema';

export const errorSchemas = {
  badRequest: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  forbidden: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
  conflict: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  role: z.enum(["USER", "ADMIN"]),
});

export const tokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

// Accept both snake_case (backend) and camelCase (frontend server)
function snakeToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = v;
  }
  return result;
}

export const productSchema = z.preprocess(
  (val) => (typeof val === "object" && val !== null ? snakeToCamel(val as Record<string, unknown>) : val),
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    imagePath: z.string().nullable(),
    avgRating: z.union([z.string(), z.number()]).transform(v => String(v)),
    ratingCount: z.union([z.string(), z.number()]).transform(v => (typeof v === "string" ? parseInt(v, 10) : v)),
    createdAt: z.union([z.string(), z.date()]).transform(v => new Date(v).toISOString()),
    updatedAt: z.union([z.string(), z.date()]).transform(v => new Date(v).toISOString()),
  })
);

export const reviewSchema = z.preprocess(
  (val) => (typeof val === "object" && val !== null ? snakeToCamel(val as Record<string, unknown>) : val),
  z.object({
    id: z.string(),
    productId: z.string(),
    userId: z.string(),
    rating: z.number(),
    comment: z.string().nullable(),
    username: z.string().nullable().optional(),
    createdAt: z.union([z.string(), z.date()]).transform(v => new Date(v).toISOString()),
    updatedAt: z.union([z.string(), z.date()]).transform(v => new Date(v).toISOString()),
  })
);

export const productImageSchema = z.object({
  id: z.string(),
  productId: z.string(),
  imagePath: z.string(),
  createdAt: z.union([z.string(), z.date()]).transform(v => new Date(v).toISOString()),
});

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: registerRequestSchema,
      responses: {
        201: authResponseSchema,
        400: errorSchemas.badRequest,
        409: errorSchemas.conflict,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginRequestSchema,
      responses: {
        200: authResponseSchema,
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
      },
    },
    refresh: {
      method: 'POST' as const,
      path: '/api/auth/refresh' as const,
      input: z.object({ refreshToken: z.string() }),
      responses: {
        200: tokensSchema,
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      input: z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
      }).optional(),
      responses: {
        200: z.array(productSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: productSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: createProductRequestSchema,
      responses: {
        201: productSchema,
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: createProductRequestSchema,
      responses: {
        200: productSchema,
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.undefined(),
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    uploadImage: {
      method: 'POST' as const,
      path: '/api/products/:id/image' as const,
      responses: {
        200: productSchema,
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    listImages: {
      method: 'GET' as const,
      path: '/api/products/:id/images' as const,
      responses: {
        200: z.array(productImageSchema),
      },
    },
    uploadImages: {
      method: 'POST' as const,
      path: '/api/products/:id/images' as const,
      responses: {
        201: z.array(productImageSchema),
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    deleteImage: {
      method: 'DELETE' as const,
      path: '/api/products/images/:imageId' as const,
      responses: {
        204: z.undefined(),
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    listReviews: {
      method: 'GET' as const,
      path: '/api/products/:id/reviews' as const,
      responses: {
        200: z.array(reviewSchema),
      },
    },
    createReview: {
      method: 'POST' as const,
      path: '/api/products/:id/reviews' as const,
      input: createReviewRequestSchema,
      responses: {
        201: reviewSchema,
        400: errorSchemas.badRequest,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
