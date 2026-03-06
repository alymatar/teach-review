import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type z } from "zod";
import { useAuth } from "@/lib/auth-context";

type CreateReviewInput = z.infer<typeof api.products.createReview.input>;

export function useReviews(productId: string) {
  return useQuery({
    queryKey: [api.products.listReviews.path, productId],
    queryFn: async () => {
      const url = buildUrl(api.products.listReviews.path, { id: productId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return api.products.listReviews.responses[200].parse(await res.json());
    },
    enabled: !!productId,
  });
}

export function useCreateReview() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, data }: { productId: string; data: CreateReviewInput }) => {
      const url = buildUrl(api.products.createReview.path, { id: productId });
      const res = await fetch(url, {
        method: api.products.createReview.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit review");
      }
      return api.products.createReview.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.products.listReviews.path, variables.productId] });
      // Invalidate product to get updated average rating
      queryClient.invalidateQueries({ queryKey: [api.products.get.path, variables.productId] });
    },
  });
}
