import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { LogOut, Lock, Mail, Phone, Building2, Briefcase, Calendar, Camera } from 'lucide-react';
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

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Profile completeness
  const fields = ['firstName', 'lastName', 'phone', 'department', 'designation', 'profilePhoto'];
  const filledCount = fields.filter(f => !!(user as any)?.[f]).length;
  const completeness = Math.round((filledCount / fields.length) * 100);

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

        {/* Profile completeness bar */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-800">Profile completeness</span>
            <span className="text-sm font-bold text-[#1a56db]">{completeness}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1a56db] rounded-full transition-all duration-700"
              style={{ width: `${completeness}%` }}
            />
          </div>
          {completeness < 100 && (
            <p className="text-xs text-gray-500 mt-1.5">
              Complete your profile to unlock all features
            </p>
          )}
        </div>

        {/* Avatar + Basic Info */}
        <Card className="flex flex-col items-center text-center py-6 gap-3">
          <div className="relative w-20 h-20 mx-auto mb-3">
            <Avatar firstName={user?.firstName} lastName={user?.lastName} size="2xl" />
            <button
              className="absolute bottom-0 right-0 w-7 h-7 bg-[#1a56db] rounded-full flex items-center justify-center shadow-md"
              aria-label="Change profile photo"
              onClick={() => {/* TODO: photo upload */}}
            >
              <Camera size={14} className="text-white" />
            </button>
          </div>
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
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Work Information</h3>
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Department</span>
              </div>
              <span className="text-sm font-medium text-gray-800">{user?.department || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Designation</span>
              </div>
              <span className="text-sm font-medium text-gray-800">{user?.designation || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Joining Date</span>
              </div>
              <span className="text-sm font-medium text-gray-800">{formatDate(user?.joinDate) || '—'}</span>
            </div>
          </div>
        </Card>

        {/* Contact Info */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Email</span>
              </div>
              <span className="text-sm font-medium text-gray-800 truncate max-w-[55%]">{user?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Phone</span>
              </div>
              <span className="text-sm font-medium text-gray-800">{user?.phone || '—'}</span>
            </div>
          </div>
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
