"use client";

import { useState, useEffect, useCallback } from "react";

interface AuthState {
  authenticated: boolean;
  prenom: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    prenom: null,
    loading: true,
  });

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check");
      if (res.ok) {
        const data = await res.json();
        setState({ authenticated: true, prenom: data.prenom, loading: false });
      } else {
        setState({ authenticated: false, prenom: null, loading: false });
      }
    } catch {
      setState({ authenticated: false, prenom: null, loading: false });
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const login = async (password: string, prenom: string) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, prenom }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await check();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ authenticated: false, prenom: null, loading: false });
    window.location.href = "/";
  };

  return { ...state, login, logout, check };
} 