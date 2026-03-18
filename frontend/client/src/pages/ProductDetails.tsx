import { useParams, Link } from "wouter";
import { useProduct, useProductImages } from "@/hooks/use-products";
import { useReviews, useCreateReview } from "@/hooks/use-reviews";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import StarRating from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Layers, MessageSquare, Send, Star, Sparkles, ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion } from "framer-motion";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  
  const { data: product, isLoading: isProductLoading, error: productError } = useProduct(id!);
  const { data: images } = useProductImages(id!);
  const { data: reviews, isLoading: isReviewsLoading } = useReviews(id!);
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (isProductLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -12, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.3), transparent)" }} />
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#a78bfa" }} />
          </div>
          <p style={{ color: "rgba(196,181,253,0.7)" }} className="font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#fca5a5" }}>Товар не найден</h2>
          <Link href="/">
            <Button variant="outline" style={{ borderColor: "rgba(139,92,246,0.4)", color: "#c4b5fd", background: "rgba(139,92,246,0.1)" }}>
              <ArrowLeft className="mr-2 h-4 w-4"/> На главную
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    const normalized = path.replace(/\\/g, "/");
    if (normalized.startsWith("http") || normalized.startsWith("/")) return normalized;
    return `/${normalized}`;
  };

  const imageUrl = getImageUrl(product.imagePath);
  const gallery = images && images.length > 0 ? images : null;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      await createReview.mutateAsync({
        productId: id!,
        data: { rating, comment: comment.trim() || undefined }
      });
      setRating(0);
      setComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", top: "55%", right: "8%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.13) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "35%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <Link href="/">
          <Button variant="ghost" className="mb-8 font-medium"
            style={{ color: "rgba(196,181,253,0.7)", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Назад к товарам
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-center min-h-[400px] lg:sticky lg:top-24 h-fit rounded-3xl p-8"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(139,92,246,0.25)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.07)"
            }}
          >
            {gallery ? (
              <div className="w-full flex flex-col gap-4">
                <div className="w-full flex items-center justify-center">
                  <img
                    src={getImageUrl(gallery[0].imagePath) ?? "#"}
                    alt={product.name}
                    className="w-full max-w-md h-auto object-contain rounded-2xl cursor-pointer"
                    style={{ filter: "drop-shadow(0 20px 40px rgba(139,92,246,0.3))" }}
                    onClick={() => {
                      setLightboxIndex(0);
                      setIsLightboxOpen(true);
                    }}
                  />
                </div>
                {gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {gallery.map((img, index) => (
                      <img
                        key={img.id}
                        src={getImageUrl(img.imagePath) ?? "#"}
                        alt=""
                        className="h-20 w-full object-cover rounded-lg cursor-pointer"
                        style={{ border: "1px solid rgba(139,92,246,0.3)" }}
                        onClick={() => {
                          setLightboxIndex(index);
                          setIsLightboxOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full max-w-md h-auto object-contain"
                style={{ filter: "drop-shadow(0 20px 40px rgba(139,92,246,0.3))" }}
              />
            ) : (
              <div className="text-center">
                <Layers className="h-24 w-24 mx-auto mb-4" style={{ color: "rgba(167,139,250,0.3)" }} />
                <p className="text-lg font-medium" style={{ color: "rgba(196,181,253,0.4)" }}>Нет изображения</p>
              </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            {product.category && (
              <div className="w-fit mb-4 px-3 py-1 rounded-full text-sm font-semibold"
                style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd" }}
              >
                {product.category}
              </div>
            )}
            
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4" style={{ color: "#ffffff" }}>
              {product.name}
            </h1>
            
            <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: "1px solid rgba(139,92,246,0.2)" }}>
              <div className="flex items-center gap-2">
                <StarRating rating={Number(product.avgRating)} size={24} />
                <span className="font-bold text-lg" style={{ color: "#ffffff" }}>{Number(product.avgRating).toFixed(1)}</span>
              </div>
              <span style={{ color: "rgba(196,181,253,0.4)" }}>|</span>
              <span className="font-medium" style={{ color: "rgba(196,181,253,0.7)" }}>{product.ratingCount} Отзывов</span>
            </div>
            
            <div className="mb-12">
              <p className="text-lg leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(196,181,253,0.8)" }}>
                {product.description || "Описание для этого товара отсутствует."}
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl"
                  style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  <MessageSquare className="h-5 w-5" style={{ color: "#a78bfa" }} />
                </div>
                <h2 className="text-2xl font-display font-bold" style={{ color: "#ffffff" }}>Отзывы пользователей</h2>
              </div>

              {/* Write Review Form */}
              {isAuthenticated ? (
                <div className="rounded-2xl p-6 mb-10"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(139,92,246,0.25)",
                    backdropFilter: "blur(10px)"
                  }}
                >
                  <h3 className="font-semibold mb-4" style={{ color: "#ffffff" }}>Написать отзыв</h3>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: "rgba(196,181,253,0.7)" }}>Оценка</label>
                      <StarRating interactive rating={rating} onRatingChange={setRating} size={28} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: "rgba(196,181,253,0.6)" }}>Комментарий (необязательно)</label>
                      <Textarea 
                        placeholder="Поделитесь своими мыслями об этом продукте..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="resize-none focus-visible:ring-0"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(139,92,246,0.3)",
                          color: "#ffffff",
                        }}
                        rows={4}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={rating === 0 || isSubmitting}
                      className="w-full sm:w-auto font-semibold border-0"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                        color: "#ffffff",
                        boxShadow: "0 4px 15px rgba(139,92,246,0.4)"
                      }}
                    >
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                      Отправить отзыв
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="rounded-2xl p-6 text-center mb-10"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(139,92,246,0.3)"
                  }}
                >
                  <p className="mb-4" style={{ color: "rgba(196,181,253,0.7)" }}>Пожалуйста, войдите, чтобы оставить отзыв.</p>
                  <Link href="/login">
                    <Button variant="outline" className="font-medium"
                      style={{ borderColor: "rgba(139,92,246,0.4)", color: "#c4b5fd", background: "rgba(139,92,246,0.1)" }}
                    >Войти</Button>
                  </Link>
                </div>
              )}

              <div className="space-y-6">
                {isReviewsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin h-8 w-8" style={{ color: "#a78bfa" }} />
                  </div>
                ) : reviews?.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(139,92,246,0.2)" }}
                  >
                    <Star className="h-10 w-10 mx-auto mb-3" style={{ color: "rgba(167,139,250,0.3)" }} />
                    <p className="italic" style={{ color: "rgba(196,181,253,0.5)" }}>Станьте первым, кто оставит отзыв об этом продукте!</p>
                  </div>
                ) : (
                  reviews?.map((review) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={review.id} 
                      className="p-6 rounded-2xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(139,92,246,0.2)",
                        backdropFilter: "blur(10px)"
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.rating} size={16} />
                          <span className="font-medium text-sm" style={{ color: "rgba(196,181,253,0.9)" }}>
                            {review.username || "Аноним"}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: "rgba(196,181,253,0.5)" }}>
                          {format(new Date(review.createdAt), "d MMM yyyy")}
                        </span>
                      </div>
                      {review.comment ? (
                        <p className="leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>{review.comment}</p>
                      ) : (
                        <p className="italic text-sm" style={{ color: "rgba(196,181,253,0.4)" }}>Комментарий не предоставлен.</p>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {isLightboxOpen && gallery && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-4 right-2 flex items-center justify-center rounded-full p-2"
              style={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.6)", color: "#e5e7eb" }}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev === 0 ? gallery.length - 1 : prev - 1
                  )
                }
                className="hidden sm:flex items-center justify-center rounded-full p-3"
                style={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.6)", color: "#e5e7eb" }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <div className="flex-1 flex items-center justify-center">
                <img
                  src={getImageUrl(gallery[lightboxIndex].imagePath) ?? "#"}
                  alt={product.name}
                  className="max-h-[80vh] w-auto object-contain rounded-2xl"
                  style={{ boxShadow: "0 25px 60px rgba(15,23,42,0.9)" }}
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev === gallery.length - 1 ? 0 : prev + 1
                  )
                }
                className="hidden sm:flex items-center justify-center rounded-full p-3"
                style={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.6)", color: "#e5e7eb" }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {gallery.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                {gallery.map((img, index) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="overflow-hidden rounded-md border"
                    style={{
                      borderColor:
                        index === lightboxIndex
                          ? "rgba(129,140,248,0.9)"
                          : "rgba(148,163,184,0.5)",
                      opacity: index === lightboxIndex ? 1 : 0.6,
                    }}
                  >
                    <img
                      src={getImageUrl(img.imagePath) ?? "#"}
                      alt=""
                      className="h-14 w-14 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}