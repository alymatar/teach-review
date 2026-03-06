import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type productImageSchema } from "@shared/routes";
import { type z } from "zod";
import { useAuth } from "@/lib/auth-context";

type CreateProductInput = z.infer<typeof api.products.create.input>;
type ProductImage = z.infer<typeof productImageSchema>;

export function useProducts(params?: { search?: string; category?: string }) {
  return useQuery({
    queryKey: [api.products.list.path, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append("search", params.search);
      if (params?.category) searchParams.append("category", params.category);
      
      const url = `${api.products.list.path}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      return api.products.list.responses[200].parse(await res.json());
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [api.products.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.products.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Product not found");
        throw new Error("Failed to fetch product");
      }
      return api.products.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const res = await fetch(api.products.create.path, {
        method: api.products.create.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create product");
      }
      return api.products.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

export function useUploadImage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);

      const url = buildUrl(api.products.uploadImage.path, { id });
      const res = await fetch(url, {
        method: api.products.uploadImage.method,
        headers: {
          "Authorization": `Bearer ${token}`,
          // Note: DO NOT set Content-Type here, let the browser set it with the boundary for FormData
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload image");
      }
      return api.products.uploadImage.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.products.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

export function useUpdateProduct() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateProductInput }) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: api.products.update.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update product");
      }
      return api.products.update.responses[200].parse(await res.json());
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.get.path, product.id] });
    },
  });
}

export function useDeleteProduct() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.products.delete.path, { id });
      const res = await fetch(url, {
        method: api.products.delete.method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete product");
      }
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

export function useProductImages(id: string | null) {
  return useQuery({
    queryKey: [api.products.listImages.path, id],
    enabled: !!id,
    queryFn: async (): Promise<ProductImage[]> => {
      const url = buildUrl(api.products.listImages.path, { id: id as string });
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch product images");
      }
      return api.products.listImages.responses[200].parse(await res.json());
    },
  });
}

export function useUploadImages() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, files }: { id: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));

      const url = buildUrl(api.products.uploadImages.path, { id });
      const res = await fetch(url, {
        method: api.products.uploadImages.method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload images");
      }
      return api.products.uploadImages.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.products.listImages.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.products.get.path, variables.id] });
    },
  });
}

export function useDeleteImage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageId, productId }: { imageId: string; productId: string }) => {
      const url = buildUrl(api.products.deleteImage.path, { imageId });
      const res = await fetch(url, {
        method: api.products.deleteImage.method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete image");
      }
      return;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.products.listImages.path, variables.productId] });
      queryClient.invalidateQueries({ queryKey: [api.products.get.path, variables.productId] });
    },
  });
}
