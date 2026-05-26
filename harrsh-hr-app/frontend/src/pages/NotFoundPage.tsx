import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle size={28} className="text-gray-400" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-lg font-semibold text-gray-700 mb-1">Page Not Found</p>
      <p className="text-sm text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate('/dashboard')} className="gap-2">
        <Home size={16} /> Back to Dashboard
      </Button>
    </div>
  );
};

export default NotFoundPage;
