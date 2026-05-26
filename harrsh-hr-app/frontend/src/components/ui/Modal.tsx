import { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode, KeyboardEvent } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  className?: string;
}

const Modal = ({ isOpen, onClose, title, children, className = '' }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={clsx(
          'relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto',
          'sm:max-w-lg',
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-gray-500" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
