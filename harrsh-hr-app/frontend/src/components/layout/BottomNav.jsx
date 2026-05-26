import { NavLink, useLocation } from 'react-router-dom';
import { Home, Clock, CheckSquare, FolderOpen, User } from 'lucide-react';
import clsx from 'clsx';
import useAppStore from '../../store/appStore.js';
import useAuth from '../../hooks/useAuth.js';

const tabs = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/attendance', icon: Clock, label: 'Attendance' },
  { to: '/approvals', icon: CheckSquare, label: 'Approvals', roles: ['MANAGER', 'HR', 'ADMIN'] },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const BottomNav = () => {
  const { user } = useAuth();
  const notificationCount = useAppStore((s) => s.notificationCount);
  const location = useLocation();

  const visibleTabs = tabs.filter(tab => !tab.roles || tab.roles.includes(user?.role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {visibleTabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={to}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[60px]',
                isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              <span className={clsx('text-[10px] font-medium', isActive ? 'text-indigo-600' : 'text-gray-400')}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
