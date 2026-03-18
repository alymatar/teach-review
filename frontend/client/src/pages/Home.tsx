import { useState } from "react";
import { useProducts } from "@/hooks/use-products";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Sparkles, Star, TrendingUp, Filter } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("all"); // Added filter state

  const { data: products, isLoading, error } = useProducts({ 
    search: debouncedSearch || undefined,
    category: filter !== "all" ? filter : undefined // Pass category to hook
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", top: "55%", right: "8%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "35%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <section className="relative pt-24 pb-32 overflow-hidden z-10">
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, rgba(15,12,41,0.95) 100%)" }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", backdropFilter: "blur(10px)" }}
          >
            <Sparkles className="h-4 w-4" style={{ color: "#a78bfa" }} />
            <span className="text-sm font-semibold" style={{ color: "#c4b5fd" }}>Честные отзывы · Реальные пользователи</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-display font-extrabold tracking-tight"
            style={{ color: "#ffffff" }}
          >
            Откройте для себя лучший{" "}
            <span style={{ background: "linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #f97316 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              техно-мир
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-xl max-w-2xl mx-auto"
            style={{ color: "rgba(196,181,253,0.8)" }}
          >
            Честные отзывы реальных пользователей. Найдите своё новое любимое устройство, программу или аксессуар.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex items-center justify-center gap-8 mt-8 flex-wrap"
          >
            {[
              { icon: Star, label: "5000+ отзывов" },
              { icon: TrendingUp, label: "Топ товары" },
              { icon: Sparkles, label: "Ежедневное обновление" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: "#a78bfa" }} />
                <span className="text-sm font-medium" style={{ color: "rgba(196,181,253,0.7)" }}>{label}</span>
              </div>
            ))}
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 max-w-2xl mx-auto"
          >
            <form onSubmit={handleSearch} className="relative flex items-center rounded-full"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(139,92,246,0.4)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)" }}
            >
              <Search className="absolute left-4 h-5 w-5" style={{ color: "rgba(196,181,253,0.6)" }} />
              <Input
                type="text"
                placeholder="Поиск товаров и брендов..."
                className="pl-12 pr-56 py-6 text-lg rounded-full border-0 focus-visible:ring-0 bg-transparent"
                style={{ color: "#ffffff" }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              
           

              <Button
                type="submit"
                className="absolute right-2 rounded-full px-6 font-semibold border-0"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)", color: "#ffffff", boxShadow: "0 4px 15px rgba(139,92,246,0.4)" }}
              >
                Поиск
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div style={{ width: 4, height: 28, borderRadius: 2, background: "linear-gradient(180deg, #a78bfa, #ec4899)" }} />
            <h2 className="text-2xl font-display font-bold" style={{ color: "#ffffff" }}>
              {debouncedSearch ? `Результаты по запросу "${debouncedSearch}"` : "Популярные товары"}
            </h2>
          </div>
          {filter !== "all" && (
             <Button variant="ghost" onClick={() => setFilter("all")} className="text-sm" style={{ color: "#a78bfa" }}>
               Сбросить фильтр
             </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#a78bfa" }} />
            <p className="mt-4 font-medium" style={{ color: "rgba(196,181,253,0.7)" }}>Загрузка товаров...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <p className="font-semibold" style={{ color: "#fca5a5" }}>Не удалось загрузить товары. Попробуйте позже.</p>
          </div>
        ) : products?.length === 0 ? (
          <div className="text-center py-20 rounded-3xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(139,92,246,0.3)" }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: "rgba(139,92,246,0.1)" }}>
              <Search className="h-8 w-8" style={{ color: "rgba(167,139,250,0.5)" }} />
            </div>
            <h3 className="text-xl font-bold" style={{ color: "#ffffff" }}>Товары не найдены</h3>
            <p className="mt-2" style={{ color: "rgba(196,181,253,0.6)" }}>Попробуйте изменить условия поиска.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products?.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 