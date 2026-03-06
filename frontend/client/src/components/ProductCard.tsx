import { Link } from "wouter";
import { type z } from "zod";
import { productSchema } from "@shared/routes";
import StarRating from "./StarRating";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

type Product = z.infer<typeof productSchema>;

export default function ProductCard({ product }: { product: Product }) {
  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return `/${path}`;
  };

  const imageUrl = getImageUrl(product.imagePath);

  return (
    <Link href={`/products/${product.id}`} className="group flex h-full">
      <div className="card-hover flex flex-col w-full bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="relative aspect-[4/3] bg-secondary/50 overflow-hidden p-6 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground/50">
              <Layers className="w-12 h-12 mb-2 opacity-50" />
              <span className="text-sm font-medium">Нет изображения</span>
            </div>
          )}
          
          {product.category && (
            <div className="absolute top-4 left-4">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-foreground/80 hover:bg-background">
                {product.category}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="font-display font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          <div className="mt-2 flex items-center gap-2">
            <StarRating rating={Number(product.avgRating)} size={16} />
            <span className="text-xs text-muted-foreground font-medium">
              ({product.ratingCount} {product.ratingCount === 1 ? "отзыв" : "отзывов"})
            </span>
          </div>
          
          <p className="mt-4 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {product.description || "Описание отсутствует."}
          </p>
        </div>
      </div>
    </Link>
  );
}
