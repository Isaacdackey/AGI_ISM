"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { AuthUser } from "@/types";

type Ctx = {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<Ctx>(null as unknown as Ctx);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try {
      const res = await api.me();
      setUser(res.user);
    } catch {
      setUser(null);
    }
  };
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setUser(res.user);
  };
  const logout = async () => {
    try { await api.logout(); } catch {}
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, login, logout, refresh, loading }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
