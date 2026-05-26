import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { LogOut, Lock, Mail, Phone, Building2, Briefcase, Calendar } from 'lucide-react';
import { changePassword as changePasswordApi } from '../api/auth';
import { logout as logoutApi } from '../api/auth';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import { changePasswordSchema } from '../utils/validators';
import { formatDate } from '../utils/formatters';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z
    .string()
    .regex(/^[+]?[\d\s\-()]{7,15}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
});

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
      <Icon size={14} className="text-gray-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
    </div>
  </div>
);

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Profile edit form (schema-validated, reset when user data loads)
  const {
    register: registerProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm({ resolver: zodResolver(profileSchema) });

  // suppress unused warning — profileErrors used for future inline edit form
  void profileErrors;
  void registerProfile;

  useEffect(() => {
    if (user) {
      resetProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user, resetProfile]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const changePwdMutation = useMutation<any, Error, { oldPassword: string; newPassword: string }>({
    mutationFn: ({ oldPassword, newPassword }) => changePasswordApi({ oldPassword, newPassword }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      reset();
    },
    onError: (err: any) => toast.error((err as any).response?.data?.message || 'Failed to change password'),
  });

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    try {
      const stored = JSON.parse(localStorage.getItem('harrsh-hr-auth') || '{}');
      const refreshToken = stored?.state?.refreshToken;
      if (refreshToken) await logoutApi(refreshToken);
    } catch (_e) {
      /* ignore logout API errors — proceed to local logout */
    }
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <Header title="Profile" />
      <div className="p-4 space-y-4">
        {/* Avatar + Basic Info */}
        <Card className="flex flex-col items-center text-center py-6 gap-3">
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size="2xl" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-gray-500">{user?.designation || 'Employee'}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge color="indigo">{user?.role}</Badge>
              <Badge status={user?.status || 'ACTIVE'} />
            </div>
          </div>
          <p className="text-xs text-gray-400 font-mono">{user?.employeeId}</p>
        </Card>

        {/* Work Info */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Work Information</h3>
          <InfoRow icon={Building2} label="Department" value={user?.department} />
          <InfoRow icon={Briefcase} label="Designation" value={user?.designation} />
          <InfoRow icon={Calendar} label="Joining Date" value={formatDate(user?.joinDate)} />
        </Card>

        {/* Contact Info */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Contact Information</h3>
          <InfoRow icon={Mail} label="Email" value={user?.email} />
          <InfoRow icon={Phone} label="Phone" value={user?.phone} />
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Lock size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Change Password</p>
              <p className="text-xs text-gray-400">Update your account password</p>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut size={16} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-600">Logout</p>
              <p className="text-xs text-gray-400">Sign out of your account</p>
            </div>
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          reset();
        }}
        title="Change Password"
      >
        <form
          onSubmit={handleSubmit((data) => changePwdMutation.mutate(data as any))}
          className="space-y-4"
        >
          <Input
            label="Current Password"
            type="password"
            required
            error={errors.oldPassword?.message}
            {...register('oldPassword')}
          />
          <Input
            label="New Password"
            type="password"
            required
            error={errors.newPassword?.message}
            hint="At least 6 characters"
            {...register('newPassword')}
          />
          <Input
            label="Confirm New Password"
            type="password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="full"
              onClick={() => {
                setShowPasswordModal(false);
                reset();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="full"
              loading={changePwdMutation.isPending}
              className="flex-1"
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
