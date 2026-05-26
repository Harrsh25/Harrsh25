import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';
import useAppStore from '../../store/appStore';
import type { ReactNode } from 'react';

const icons: Record<string, ReactNode> = {
  success: <CheckCircle size={18} className="text-green-600" />,
  error: <XCircle size={18} className="text-red-600" />,
  warning: <AlertTriangle size={18} className="text-yellow-600" />,
  info: <Info size={18} className="text-blue-600" />,
};

const bgMap: Record<string, string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info: 'bg-blue-50 border-blue-200',
};

interface ToastItemProps {
  id: number;
  message: string;
  type: string;
}

const ToastItem = ({ id, message, type }: ToastItemProps) => {
  const removeToast = useAppStore((s) => s.removeToast);
  const isAlert = type === 'error' || type === 'warning';
  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      className={clsx(
        'flex items-start gap-3 p-3 rounded-xl border shadow-lg min-w-[280px] max-w-sm',
        bgMap[type] || bgMap.info
      )}
    >
      {icons[type] || icons.info}
      <p className="text-sm text-gray-800 flex-1">{message}</p>
      <button onClick={() => removeToast(id)} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss notification">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const toasts = useAppStore((s) => s.toasts);
  return (
    <div aria-live="polite" aria-atomic="false" className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
