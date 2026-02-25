import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  name: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Base URL of the Express backend — must match VITE_API_URL in your .env
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("auth");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Decode JWT and check expiry without a library
        const payload = JSON.parse(atob(parsed.token.split(".")[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setToken(parsed.token);
          setUser(parsed.user);
        } else {
          // Token expired — clear storage
          localStorage.removeItem("auth");
        }
      } catch {
        localStorage.removeItem("auth");
      }
    }
  }, []);

  const persist = (t: string, u: User) => {
    setToken(t);
    setUser(u);
    localStorage.setItem("auth", JSON.stringify({ token: t, user: u }));
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    persist(data.token, data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
