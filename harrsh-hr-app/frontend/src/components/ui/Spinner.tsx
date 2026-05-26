import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
}

const Spinner = ({ size = 24, className = '' }: SpinnerProps) => (
  <Loader2 size={size} className={clsx('animate-spin text-indigo-600', className)} />
);

export const FullPageSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
    <Spinner size={36} />
  </div>
);

export default Spinner;
