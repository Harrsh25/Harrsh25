import clsx from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(({
  label, error, required, type = 'text', className = '', containerClassName = '', hint, ...props
}, ref) => {
  return (
    <div className={clsx('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={clsx(
          'w-full px-3 py-2.5 border rounded-xl text-sm bg-white text-gray-900 placeholder-gray-400 transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400',
          props.disabled && 'bg-gray-50 cursor-not-allowed',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
