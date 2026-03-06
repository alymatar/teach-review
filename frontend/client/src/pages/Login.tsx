import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MonitorSmartphone, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync(formData);
      setLocation("/");
    } catch (err) {
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
          С возвращением
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            Зарегистрироваться
          </Link>
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-card py-8 px-4 shadow-xl shadow-black/5 sm:rounded-3xl sm:px-10 border border-border/50">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="emailOrUsername">Email или имя пользователя</Label>
              <div className="mt-2">
                <Input
                  id="emailOrUsername"
                  name="emailOrUsername"
                  type="text"
                  required
                  className="py-6 bg-secondary/50 focus-visible:bg-background"
                  placeholder="Введите email или имя пользователя"
                  value={formData.emailOrUsername}
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
                  className="py-6 bg-secondary/50 focus-visible:bg-background"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-base font-semibold shadow-lg shadow-primary/20"
              disabled={login.isPending}
            >
              {login.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Войти"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
