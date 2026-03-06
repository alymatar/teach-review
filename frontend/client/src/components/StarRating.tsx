import { Star, StarHalf } from "lucide-react";

interface StarRatingProps {
  rating: number; // Can be a float like 4.5
  max?: number;
  size?: number;
  className?: string;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  max = 5,
  size = 18,
  className = "",
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= max; i++) {
      const isFull = i <= Math.floor(rating);
      const isHalf = !isFull && i === Math.ceil(rating) && rating % 1 !== 0;

      stars.push(
        <button
          key={i}
          type={interactive ? "button" : "button"}
          disabled={!interactive}
          onClick={() => interactive && onRatingChange?.(i)}
          className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} focus:outline-none`}
        >
          {isFull ? (
            <Star
              size={size}
              className="fill-amber-400 text-amber-400"
            />
          ) : isHalf ? (
            <div className="relative">
              <Star size={size} className="text-muted-foreground/30" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star size={size} className="fill-amber-400 text-amber-400" />
              </div>
            </div>
          ) : (
            <Star size={size} className={interactive ? "text-muted-foreground hover:text-amber-400/50" : "text-muted-foreground/30"} />
          )}
        </button>
      );
    }
    return stars;
  };

  return <div className={`flex items-center gap-1 ${className}`}>{renderStars()}</div>;
}
