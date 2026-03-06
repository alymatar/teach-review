import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MonitorSmartphone, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Register() {
  const [, setLocation] = useLocation();
  const register = useRegister();
  
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync(formData);
      setLocation("/");
    } catch (err) {
      // Error handled by hook toast
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-secondary/30 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <MonitorSmartphone className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-display font-extrabold text-foreground">
          Создать аккаунт
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            Войти
          </Link>
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-card py-8 px-4 shadow-xl shadow-black/5 sm:rounded-3xl sm:px-10 border border-border/50">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="mt-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="py-5 bg-secondary/50 focus-visible:bg-background"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="username">Имя пользователя</Label>
              <div className="mt-2">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  required
                  minLength={3}
                  className="py-5 bg-secondary/50 focus-visible:bg-background"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Пароль</Label>
              <div className="mt-2">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="py-5 bg-secondary/50 focus-visible:bg-background"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground mt-2">Минимум 6 символов.</p>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-base font-semibold shadow-lg shadow-primary/20 mt-6"
              disabled={register.isPending}
            >
              {register.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Создать аккаунт"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
