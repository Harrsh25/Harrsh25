import clsx from 'clsx';
import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | any;
  required?: boolean;
  containerClassName?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, required, className = '', containerClassName = '', rows = 4, ...props }, ref) => {
  return (
    <div className={clsx('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={clsx(
          'w-full px-3 py-2.5 border rounded-xl text-sm bg-white text-gray-900 placeholder-gray-400 transition-colors duration-150 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{typeof error === 'string' ? error : error?.message}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Textarea;
