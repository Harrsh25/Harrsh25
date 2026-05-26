import clsx from 'clsx';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  containerClassName?: string;
}

const Input = ({
  label, error, hint, icon, rightIcon,
  containerClassName = '', className = '', id, required, ...props
}: InputProps) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const hintId = inputId ? `${inputId}-hint` : undefined;

  return (
    <div className={clsx('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={clsx(error && errorId, hint && hintId) || undefined}
          aria-required={required}
          className={clsx(
            'w-full rounded-xl border bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent',
            icon ? 'pl-9' : '',
            rightIcon ? 'pr-9' : '',
            error
              ? 'border-red-400 bg-red-50 dark:bg-red-900/10 focus:ring-red-400'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  );
};

export default Input;
