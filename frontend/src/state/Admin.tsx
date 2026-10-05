/** Whether the shop owner is signed in (checked quietly on page load). */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { adminApi } from "../api/client";

interface AdminState {
  username: string | null;
  checked: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  expire: () => void;
}

const Ctx = createContext<AdminState | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    adminApi.me().then((r) => setUsername(r.username)).catch(() => setUsername(null)).finally(() => setChecked(true));
  }, []);

  const signIn = useCallback(async (u: string, p: string) => {
    const r = await adminApi.login(u, p);
    setUsername(r.username);
  }, []);
  const signOut = useCallback(async () => {
    await adminApi.logout().catch(() => {});
    setUsername(null);
  }, []);
  const expire = useCallback(() => setUsername(null), []);

  return <Ctx.Provider value={{ username, checked, signIn, signOut, expire }}>{children}</Ctx.Provider>;
}

export function useAdmin(): AdminState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used inside AdminProvider");
  return v;
}
