import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';
import ToastContainer from '../ui/Toast.jsx';

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
};

export default AppLayout;
