import { create } from 'zustand';

let toastId = 0;

interface Toast { id: number; message: string; type: string; }
interface AppState {
  notificationCount: number;
  isLoading: boolean;
  toasts: Toast[];
  setNotificationCount: (countOrUpdater: number | ((prev: number) => number)) => void;
  setLoading: (isLoading: boolean) => void;
  addToast: (message: string, type?: string) => number;
  removeToast: (id: number) => void;
}

const useAppStore = create<AppState>((set) => ({
  notificationCount: 0,
  isLoading: false,
  toasts: [],

  setNotificationCount: (countOrUpdater) => set((state) => ({
    notificationCount: typeof countOrUpdater === 'function'
      ? countOrUpdater(state.notificationCount)
      : countOrUpdater,
  })),
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
