import { RefreshCw } from 'lucide-react';

interface Props {
  pulling: boolean;
  pullDistance: number;
}

const PullToRefreshIndicator = ({ pulling, pullDistance }: Props) => {
  if (pullDistance < 10) return null;
  return (
    <div
      className="flex items-center justify-center transition-all duration-150"
      style={{ height: pullDistance, overflow: 'hidden' }}
    >
      <div className={`flex items-center gap-2 text-xs text-gray-500 ${pulling ? 'text-[#1a56db]' : ''}`}>
        <RefreshCw
          size={16}
          className={pulling ? 'animate-spin text-[#1a56db]' : 'text-gray-400'}
          style={{ transform: `rotate(${Math.min(pullDistance * 2, 360)}deg)` }}
        />
        <span>{pulling ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
