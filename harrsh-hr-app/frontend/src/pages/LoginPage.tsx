import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Building2 } from 'lucide-react';
import { login as loginApi } from '../api/auth.js';
import useAuth from '../hooks/useAuth.js';
import useToast from '../hooks/useToast.js';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import ToastContainer from '../components/ui/Toast.jsx';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const result = await loginApi(data);
      if (result.success) {
        login(result.data.user, result.data.accessToken);
        // Store refresh token
        const stored = JSON.parse(localStorage.getItem('harrsh-hr-auth') || '{}');
        stored.state = { ...(stored.state || {}), refreshToken: result.data.refreshToken };
        localStorage.setItem('harrsh-hr-auth', JSON.stringify(stored));
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      setError('root', { message });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <ToastContainer />
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 size={32} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Harrsh HR</h1>
            <p className="text-sm text-gray-500 mt-1">Human Resource Management</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`w-full px-3 py-2.5 pr-10 border rounded-xl text-sm bg-white text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>

            {errors.root && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{errors.root.message}</p>
              </div>
            )}

            <Button type="submit" size="full" loading={isSubmitting}>
              Sign In
            </Button>
          </form>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-2">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { role: 'Admin', email: 'admin@harrsh.com', pwd: 'Admin@123' },
                { role: 'HR', email: 'hr@harrsh.com', pwd: 'Hr@123' },
                { role: 'Manager', email: 'manager.eng@harrsh.com', pwd: 'Manager@123' },
                { role: 'Employee', email: 'emp1@harrsh.com', pwd: 'Employee@123' },
              ].map(({ role, email, pwd }) => (
                <div key={role} className="bg-gray-50 rounded-lg p-2">
                  <p className="font-medium text-gray-700">{role}</p>
                  <p className="text-gray-500 truncate">{email}</p>
                  <p className="text-gray-500">{pwd}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
