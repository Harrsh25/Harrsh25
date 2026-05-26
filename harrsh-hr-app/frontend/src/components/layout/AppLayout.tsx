import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import ToastContainer from '../ui/Toast';

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <main id="main-content" className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
};

export default AppLayout;
