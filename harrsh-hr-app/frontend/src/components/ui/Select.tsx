import clsx from 'clsx';
import { forwardRef } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | any;
  required?: boolean;
  options?: SelectOption[];
  containerClassName?: string;
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, required, options = [], className = '', containerClassName = '', placeholder, ...props }, ref) => {
  return (
    <div className={clsx('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'w-full px-3 py-2.5 border rounded-xl text-sm bg-white text-gray-900 transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400',
          props.disabled && 'bg-gray-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{typeof error === 'string' ? error : error?.message}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
