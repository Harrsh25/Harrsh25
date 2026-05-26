import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const Spinner = ({ size = 24, className = '' }) => (
  <Loader2 size={size} className={clsx('animate-spin text-indigo-600', className)} />
);

export const FullPageSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
    <Spinner size={36} />
  </div>
);

export default Spinner;
