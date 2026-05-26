import { NavLink } from 'react-router-dom';
import { Home, Clock, FileText, FolderOpen, User } from 'lucide-react';
import clsx from 'clsx';
import useAppStore from '../../store/appStore';
import useAuth from '../../hooks/useAuth';

const tabs = [
  { to: '/dashboard',   icon: Home,       label: 'Home' },
  { to: '/attendance',  icon: Clock,      label: 'Attend' },
  { to: '/documents',   icon: FileText,   label: 'Docs' },
  { to: '/projects',    icon: FolderOpen, label: 'Projects' },
  { to: '/profile',     icon: User,       label: 'Profile' },
];

const BottomNav = () => {
  const notificationCount = useAppStore(s => s.notificationCount);
  const { user } = useAuth();
  void user;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-bottom"
    >
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className="flex-1"
          >
            {({ isActive }) => (
              <div className={clsx(
                'flex flex-col items-center justify-center h-full gap-0.5 relative',
                'transition-colors duration-150'
              )}>
                <div className="relative">
                  <Icon
                    size={22}
                    aria-hidden="true"
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={clsx(
                      'transition-colors duration-150',
                      isActive ? 'text-[#1a56db]' : 'text-gray-400 dark:text-gray-500'
                    )}
                  />
                  {/* Notification badge on dashboard tab */}
                  {to === '/dashboard' && notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </div>
                <span className={clsx(
                  'text-[10px] font-medium transition-colors duration-150',
                  isActive ? 'text-[#1a56db]' : 'text-gray-400 dark:text-gray-500'
                )}>
                  {label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#1a56db]" aria-hidden="true" />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
