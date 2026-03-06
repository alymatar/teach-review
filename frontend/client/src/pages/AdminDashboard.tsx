import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  useCreateProduct,
  useProducts,
  useUpdateProduct,
  useDeleteProduct,
  useProductImages,
  useUploadImages,
  useDeleteImage,
} from "@/hooks/use-products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  PackagePlus,
  ImagePlus,
  Loader2,
  CheckCircle2,
  Trash2,
  Edit3,
  Images,
  Sparkles,
  Shield,
  ArrowRight,
  Upload,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const { isAdmin, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createProduct = useCreateProduct();
  const { data: products } = useProducts();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const { data: productImages } = useProductImages(selectedProductId);
  const uploadImages = useUploadImages();
  const deleteImage = useDeleteImage();

  const [step, setStep] = useState<1 | 2>(1);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: "", description: "", category: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "", category: "" });
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [editFiles, setEditFiles] = useState<File[]>([]);

  const categories = Array.from(
    new Set(
      (products ?? [])
        .map((p) => p.category)
        .filter((c): c is string => !!c && c.trim() !== "")
    )
  );

  useEffect(() => {
    if (!selectedProductId || !products) return;
    const p = products.find((x) => x.id === selectedProductId);
    if (!p) return;
    setEditForm({ name: p.name ?? "", description: p.description ?? "", category: p.category ?? "" });
  }, [selectedProductId, products]);

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4"
        style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0f0f0f 100%)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative">
          <div className="absolute inset-0 blur-3xl rounded-full" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)" }} />
          <div className="relative p-6 rounded-3xl border mb-6 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a1a1a, #222)", borderColor: "rgba(212,175,55,0.3)" }}>
            <Shield className="h-16 w-16" style={{ color: "#D4AF37" }} />
          </div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-3xl font-bold mb-3" style={{ color: "#D4AF37" }}>
          Доступ запрещён
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mb-8 max-w-md" style={{ color: "#888" }}>
          Для просмотра этой страницы требуются права администратора.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button onClick={() => setLocation("/products")}
            className="px-8 py-6 rounded-2xl font-semibold border-0 transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #D4AF37, #F5D06B)", color: "#0a0a0a" }}>
            Назад к товарам <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createProduct.mutateAsync(formData);
      setCreatedProductId(result.id);
      setStep(2);
      toast({ title: "Товар создан", description: "Теперь добавьте одно или несколько изображений." });
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка", description: (err as Error).message });
    }
  };

  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdProductId) return;
    try {
      if (createFiles.length > 0) {
        await uploadImages.mutateAsync({ id: createdProductId, files: createFiles });
      }
      toast({ title: "Успешно", description: "Товар успешно опубликован!" });
      setLocation(`/products/${createdProductId}`);
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка загрузки", description: (err as Error).message });
    }
  };

  const resetForm = () => {
    setStep(1);
    setCreatedProductId(null);
    setFormData({ name: "", description: "", category: "" });
    setCreateFiles([]);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    try {
      await updateProduct.mutateAsync({ id: selectedProductId, data: editForm });
      toast({ title: "Товар обновлён", description: "Изменения сохранены." });
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка обновления", description: (err as Error).message });
    }
  };

  const handleDeleteProductClick = async () => {
    if (!selectedProductId) return;
    if (!window.confirm("Вы уверены, что хотите удалить этот товар?")) return;
    try {
      await deleteProduct.mutateAsync(selectedProductId);
      toast({ title: "Товар удалён" });
      setSelectedProductId(null);
      setEditForm({ name: "", description: "", category: "" });
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка удаления", description: (err as Error).message });
    }
  };

  const handleUploadMoreImages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || editFiles.length === 0) return;
    try {
      await uploadImages.mutateAsync({ id: selectedProductId, files: editFiles });
      toast({ title: "Изображения загружены" });
      setEditFiles([]);
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка загрузки", description: (err as Error).message });
    }
  };

  const handleDeleteImageClick = async (imageId: string, productId: string) => {
    try {
      await deleteImage.mutateAsync({ imageId, productId });
      toast({ title: "Изображение удалено" });
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка удаления", description: (err as Error).message });
    }
  };

  const inputStyle = {
    background: "#1a1a1a",
    borderColor: "rgba(212,175,55,0.25)",
    color: "#e8e8e8",
  };

  const cardStyle = {
    background: "linear-gradient(160deg, #161616 0%, #111111 100%)",
    borderColor: "rgba(212,175,55,0.2)",
    boxShadow: "0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.1)",
  };

  const goldGradient = "linear-gradient(135deg, #D4AF37, #F5D06B)";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #080808 0%, #0f0f0f 50%, #0a0a0a 100%)" }}>
      {/* Ambient background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl" style={{ background: goldGradient, boxShadow: "0 8px 32px rgba(212,175,55,0.4)" }}>
              <Sparkles className="h-7 w-7 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={{ background: goldGradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Панель администратора
              </h1>
              <p className="mt-1" style={{ color: "#888" }}>Управление товарами, изображениями и настройками каталога.</p>
            </div>
          </div>
          {/* Gold divider line */}
          <div className="mt-6 h-px w-full" style={{ background: "linear-gradient(to right, rgba(212,175,55,0.6), rgba(212,175,55,0.1), transparent)" }} />
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create New Product Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border overflow-hidden"
            style={cardStyle}
          >
            {/* Steps Header */}
            <div className="flex" style={{ borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
              {[1, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => s === 1 && step === 2 && resetForm()}
                  className="flex-1 py-5 text-center font-semibold transition-all duration-300 relative"
                  style={{
                    color: step === s ? "#D4AF37" : "#555",
                    background: step === s ? "linear-gradient(to bottom, rgba(212,175,55,0.08), transparent)" : "transparent",
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                      style={step === s
                        ? { background: goldGradient, color: "#0a0a0a", boxShadow: "0 4px 15px rgba(212,175,55,0.5)" }
                        : { background: "#222", color: "#555" }}>
                      {s}
                    </span>
                    {s === 1 ? "Данные товара" : "Загрузить изображение"}
                  </span>
                  {step === s && (
                    <motion.div layoutId="activeStep" className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: goldGradient }} />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.form key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleProductSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="font-medium flex items-center gap-2" style={{ color: "#D4AF37" }}>
                        <Package className="h-4 w-4" />
                        Название товара *
                      </Label>
                      <Input id="name" required placeholder="Введите название товара"
                        className="h-12 rounded-xl border focus:ring-2 focus:outline-none transition-all duration-200"
                        style={{ ...inputStyle, "--tw-ring-color": "rgba(212,175,55,0.3)" } as any}
                        value={formData.name}
                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="font-medium" style={{ color: "#aaa" }}>Категория</Label>
                      <Input
                        id="category"
                        placeholder="например: Смартфоны, Аудио..."
                        list="category-options"
                        className="h-12 rounded-xl border transition-all duration-200"
                        style={inputStyle}
                        value={formData.category}
                        onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} />
                      <datalist id="category-options">
                        {categories.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-medium" style={{ color: "#aaa" }}>Описание</Label>
                      <Textarea id="description" placeholder="Опишите ваш товар..."
                        className="min-h-[140px] resize-none rounded-xl border transition-all duration-200"
                        style={inputStyle}
                        value={formData.description}
                        onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button type="submit" disabled={createProduct.isPending}
                        className="px-8 py-6 rounded-2xl font-semibold border-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl disabled:opacity-50"
                        style={{ background: goldGradient, color: "#0a0a0a", boxShadow: "0 8px 25px rgba(212,175,55,0.35)" }}>
                        {createProduct.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Далее: Изображение
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 text-center py-6">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                      className="relative mx-auto w-20 h-20">
                      <div className="absolute inset-0 blur-2xl rounded-full" style={{ background: "rgba(212,175,55,0.3)" }} />
                      <div className="relative w-full h-full rounded-full flex items-center justify-center"
                        style={{ background: goldGradient, boxShadow: "0 8px 32px rgba(212,175,55,0.5)" }}>
                        <CheckCircle2 className="h-10 w-10 text-black" />
                      </div>
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-bold" style={{ color: "#D4AF37" }}>Товар создан!</h3>
                      <p className="mt-2" style={{ color: "#888" }}>Загрузите одно или несколько изображений для завершения объявления.</p>
                    </div>

                    <form onSubmit={handleImageSubmit} className="max-w-md mx-auto space-y-6">
                      <div className="relative group cursor-pointer rounded-2xl p-10 border-2 border-dashed transition-all duration-300"
                        style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.03)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.6)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)")}>
                        <Input type="file" accept="image/*" multiple
                          onChange={(e) => setCreateFiles(Array.from(e.target.files || []))}
                          className="hidden" id="image-upload" />
                        <Label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                            style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
                            <Upload className="h-8 w-8" style={{ color: "#D4AF37" }} />
                          </div>
                          <span className="font-semibold text-lg" style={{ color: "#D4AF37" }}>Нажмите для выбора изображений</span>
                          <span className="text-sm mt-2" style={{ color: createFiles.length ? "#4ade80" : "#666" }}>
                            {createFiles.length ? `Выбрано файлов: ${createFiles.length}` : "PNG, JPG — можно выбрать несколько"}
                          </span>
                        </Label>
                      </div>

                      <div className="flex gap-4 justify-center pt-4">
                        <Button type="button" variant="outline" onClick={resetForm}
                          className="px-6 py-5 rounded-xl font-medium transition-all duration-200 border"
                          style={{ background: "transparent", borderColor: "rgba(212,175,55,0.3)", color: "#888" }}>
                          Пропустить сейчас
                        </Button>
                        <Button type="submit" disabled={uploadImages.isPending}
                          className="px-8 py-5 rounded-xl font-semibold border-0 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
                          style={{ background: goldGradient, color: "#0a0a0a", boxShadow: "0 8px 25px rgba(212,175,55,0.35)" }}>
                          {uploadImages.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                          Загрузить и опубликовать
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Manage Existing Products Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl border overflow-hidden"
            style={cardStyle}
          >
            <div className="px-8 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(212,175,55,0.15)", background: "linear-gradient(to right, rgba(212,175,55,0.06), transparent)" }}>
              <div className="p-2.5 rounded-xl" style={{ background: goldGradient, boxShadow: "0 4px 15px rgba(212,175,55,0.4)" }}>
                <Images className="h-5 w-5 text-black" />
              </div>
              <h2 className="font-bold text-xl" style={{ color: "#D4AF37" }}>Управление существующими товарами</h2>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="product-select" className="font-medium" style={{ color: "#aaa" }}>Выберите товар</Label>
                <select
                  id="product-select"
                  className="w-full h-12 rounded-xl px-4 text-sm font-medium border focus:outline-none transition-all duration-200 cursor-pointer"
                  style={{
                    ...inputStyle,
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23D4AF37' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 0.75rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.5em 1.5em",
                    paddingRight: "2.5rem",
                    appearance: "none",
                  }}
                  value={selectedProductId ?? ""}
                  onChange={(e) => setSelectedProductId(e.target.value || null)}
                >
                  <option value="" style={{ background: "#1a1a1a" }}>-- Выберите товар --</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id} style={{ background: "#1a1a1a" }}>{p.name}</option>
                  ))}
                </select>
              </div>

              <AnimatePresence mode="wait">
                {selectedProductId && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2" style={{ color: "#D4AF37" }}>
                        <Edit3 className="h-4 w-4" />
                        Редактировать данные товара
                      </h3>
                      <Button variant="destructive" size="sm" onClick={handleDeleteProductClick} disabled={deleteProduct.isPending}
                        className="rounded-xl px-4 py-2 border-0 font-medium transition-all duration-200"
                        style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)", boxShadow: "0 4px 15px rgba(239,68,68,0.3)" }}>
                        {deleteProduct.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Удалить
                      </Button>
                    </div>

                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name" className="font-medium" style={{ color: "#aaa" }}>Название товара *</Label>
                        <Input id="edit-name" required className="h-12 rounded-xl border transition-all duration-200" style={inputStyle}
                          value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-category" className="font-medium" style={{ color: "#aaa" }}>Категория</Label>
                        <Input
                          id="edit-category"
                          className="h-12 rounded-xl border transition-all duration-200"
                          style={inputStyle}
                          list="category-options-edit"
                          value={editForm.category}
                          onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                        />
                        <datalist id="category-options-edit">
                          {categories.map((cat) => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-description" className="font-medium" style={{ color: "#aaa" }}>Описание</Label>
                        <Textarea id="edit-description" className="min-h-[100px] resize-none rounded-xl border transition-all duration-200" style={inputStyle}
                          value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                      </div>
                      <Button type="submit" disabled={updateProduct.isPending}
                        className="px-6 py-5 rounded-xl font-semibold border-0 transition-all duration-300 hover:-translate-y-0.5"
                        style={{ background: goldGradient, color: "#0a0a0a", boxShadow: "0 6px 20px rgba(212,175,55,0.35)" }}>
                        {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Сохранить изменения
                      </Button>
                    </form>

                    {/* Images Section */}
                    <div className="pt-6 space-y-5" style={{ borderTop: "1px solid rgba(212,175,55,0.15)" }}>
                      <h3 className="font-semibold flex items-center gap-2" style={{ color: "#D4AF37" }}>
                        <ImagePlus className="h-4 w-4" />
                        Изображения товара
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {productImages?.length ? (
                          productImages.map((img) => (
                            <motion.div key={img.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                              className="relative group rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-xl"
                              style={{ borderColor: "rgba(212,175,55,0.2)", boxShadow: "0 4px 15px rgba(0,0,0,0.4)" }}>
                              <img src={`/${img.imagePath}`} alt="" className="h-28 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }} />
                              <button type="button"
                                className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300"
                                style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(212,175,55,0.4)", color: "#D4AF37" }}
                                onClick={() => handleDeleteImageClick(img.id, selectedProductId)}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </motion.div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-8 rounded-xl border border-dashed"
                            style={{ borderColor: "rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.03)" }}>
                            <Images className="h-10 w-10 mx-auto mb-2" style={{ color: "rgba(212,175,55,0.3)" }} />
                            <p className="text-sm" style={{ color: "#555" }}>Изображения ещё не загружены.</p>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleUploadMoreImages} className="space-y-4">
                        <div className="rounded-xl p-6 border-2 border-dashed cursor-pointer transition-all duration-300"
                          style={{ borderColor: "rgba(212,175,55,0.25)", background: "rgba(212,175,55,0.02)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.5)")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.25)")}>
                          <Input type="file" accept="image/*" multiple
                            onChange={(e) => setEditFiles(Array.from(e.target.files || []))}
                            className="hidden" id="edit-images-upload" />
                          <Label htmlFor="edit-images-upload" className="cursor-pointer flex flex-col items-center text-sm">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
                              <Upload className="h-6 w-6" style={{ color: "#D4AF37" }} />
                            </div>
                            <span className="font-semibold" style={{ color: "#D4AF37" }}>Нажмите для выбора изображений</span>
                            <span className="mt-1" style={{ color: editFiles.length ? "#4ade80" : "#555" }}>
                              {editFiles.length ? `Выбрано файлов: ${editFiles.length}` : "Можно загрузить несколько изображений"}
                            </span>
                          </Label>
                        </div>
                        <Button type="submit" disabled={!editFiles.length || uploadImages.isPending}
                          className="px-6 py-5 rounded-xl font-semibold border-0 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
                          style={{ background: goldGradient, color: "#0a0a0a", boxShadow: "0 6px 20px rgba(212,175,55,0.35)" }}>
                          {uploadImages.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Загрузить изображения
                        </Button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}