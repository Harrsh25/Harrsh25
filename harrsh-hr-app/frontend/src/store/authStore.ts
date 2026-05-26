import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserData {
  id: string;
  employeeId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  designation?: string;
  phone?: string;
  profilePhoto?: string;
  organizationId?: string;
  status?: string;
  [key: string]: any;
}

interface AuthState {
  user: UserData | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: UserData, accessToken: string) => void;
  logout: () => void;
  updateUser: (data: Partial<UserData>) => void;
  setAccessToken: (accessToken: string) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      updateUser: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : (data as UserData) })),
      setAccessToken: (accessToken) => set({ accessToken }),
    }),
    {
      name: 'harrsh-hr-auth',
      partialize: (state: AuthState) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
