import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell } from 'lucide-react';
import clsx from 'clsx';
import useAppStore from '../../store/appStore';
import type { ReactNode } from 'react';

interface HeaderProps {
  title: any;
  showBack?: boolean;
  rightAction?: ReactNode;
  className?: string;
}

const Header = ({ title, showBack = false, rightAction, className = '' }: HeaderProps) => {
  const navigate = useNavigate();
  const notificationCount = useAppStore((s) => s.notificationCount);

  return (
    <header className={clsx('flex items-center justify-between h-14 px-4 bg-white border-b border-gray-100 sticky top-0 z-30', className)}>
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors -ml-2 flex-shrink-0"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
        )}
        <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {rightAction}
        <button
          onClick={() => navigate('/notifications')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors relative"
        >
          <Bell size={20} className="text-gray-600" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
