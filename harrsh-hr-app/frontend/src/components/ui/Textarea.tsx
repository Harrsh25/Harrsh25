import clsx from 'clsx';
import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | any;
  maxLength?: number;
  containerClassName?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, maxLength, containerClassName = '', className = '', value, onChange, required, rows = 4, ...props }, ref) => {
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className={clsx('flex flex-col gap-1', containerClassName)}>
        {label && (
          <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          aria-invalid={!!error}
          className={clsx(
            'w-full rounded-xl border bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none',
            'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent',
            error
              ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300',
            className
          )}
          {...props}
        />
        <div className="flex justify-between items-center">
          {error ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              ⚠ {typeof error === 'string' ? error : error?.message}
            </p>
          ) : <span />}
          {maxLength && (
            <p className={clsx('text-xs', charCount >= maxLength * 0.9 ? 'text-red-500' : 'text-gray-400')}>
              {charCount} / {maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
