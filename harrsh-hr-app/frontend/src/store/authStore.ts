import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      updateUser: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : data })),
      setAccessToken: (accessToken) => set({ accessToken }),
    }),
    {
      name: 'harrsh-hr-auth',
      partialState: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
