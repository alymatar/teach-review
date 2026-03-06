import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";

// Pages
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ProductDetails from "@/pages/ProductDetails";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/AdminDashboard";

// Components
import Navbar from "@/components/Navbar";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/products/:id" component={ProductDetails} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/admin" component={AdminDashboard} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <footer className="border-t border-border/50 bg-secondary/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p className="font-display font-semibold tracking-tight text-foreground/50">ИУК4-82Б &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
