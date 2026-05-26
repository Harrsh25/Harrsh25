import { create } from 'zustand';

let toastId = 0;

const useAppStore = create((set) => ({
  notificationCount: 0,
  isLoading: false,
  toasts: [],

  setNotificationCount: (count) => set({ notificationCount: count }),
  setLoading: (isLoading) => set({ isLoading }),

  addToast: (message, type = 'info') => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
    return id;
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export default useAppStore;
