import useAppStore from '../store/appStore.js';

const useToast = () => {
  const { addToast, removeToast } = useAppStore();

  return {
    toast: (message, type = 'info') => addToast(message, type),
    success: (message) => addToast(message, 'success'),
    error: (message) => addToast(message, 'error'),
    warning: (message) => addToast(message, 'warning'),
    info: (message) => addToast(message, 'info'),
    remove: removeToast,
  };
};

export default useToast;
