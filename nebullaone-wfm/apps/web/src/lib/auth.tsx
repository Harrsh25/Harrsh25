import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';

export type Role = 'admin' | 'procurement' | 'legal' | 'finance' | 'project' | 'qa_hse' | 'vendor';
export interface User { id: number; email: string; name: string; role: Role; vendorId: string | null }

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator', procurement: 'Procurement', legal: 'Legal Counsel', finance: 'Finance Controller',
  project: 'Project / Site Engineer', qa_hse: 'QA / HSE', vendor: 'Vendor portal',
};

interface AuthCtx { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<User>; logout: () => void; can: (...roles: Role[]) => boolean }
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const logout = useCallback(() => { tokenStore.set(null); setUser(null); }, []);
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) { setLoading(false); return; }
    api<{ user: User }>('/auth/me').then((r) => setUser(r.user)).catch(() => tokenStore.set(null)).finally(() => setLoading(false));
  }, [logout]);
  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/auth/login', { body: { email, password } });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);
  const can = useCallback((...roles: Role[]) => !!user && (user.role === 'admin' || roles.includes(user.role)), [user]);
  const v = useMemo(() => ({ user, loading, login, logout, can }), [user, loading, login, logout, can]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};
