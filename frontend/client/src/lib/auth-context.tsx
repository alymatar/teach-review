import React, { createContext, useContext, useState, useEffect } from "react";
import { type z } from "zod";
import { userSchema } from "@shared/routes";

type User = z.infer<typeof userSchema>;

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("techreviews_token");
    const storedUser = localStorage.getItem("techreviews_user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("techreviews_token");
        localStorage.removeItem("techreviews_user");
      }
    }
    setIsLoaded(true);
  }, []);

  const setAuth = (newUser: User | null, newToken: string | null) => {
    setUser(newUser);
    setToken(newToken);
    if (newUser && newToken) {
      localStorage.setItem("techreviews_token", newToken);
      localStorage.setItem("techreviews_user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("techreviews_token");
      localStorage.removeItem("techreviews_user");
    }
  };

  const logout = () => {
    setAuth(null, null);
  };

  if (!isLoaded) return null; 

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isAdmin: user?.role === "ADMIN",
        setAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
