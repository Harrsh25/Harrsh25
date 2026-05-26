import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, Calendar, CheckSquare, Bell, Users, Briefcase, TrendingUp, DollarSign } from 'lucide-react';
import { getDashboardStats } from '../api/dashboard.js';
import useAuth from '../hooks/useAuth.js';
import Header from '../components/layout/Header.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { SkeletonCard } from '../components/ui/Skeleton.jsx';
import { formatCurrency, formatTime } from '../utils/formatters.js';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';

const StatCard = ({ icon: Icon, label, value, color = 'indigo', onClick }) => (
  <Card className="flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${color}-100`}>
      <Icon size={18} className={`text-${color}-600`} />
    </div>
    <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </Card>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboardStats });

  const stats = data?.data;
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 space-y-5">
        {/* Greeting */}
        <div className="flex items-center gap-3">
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size="lg" />
          <div>
            <p className="text-sm text-gray-500">{greeting()},</p>
            <h2 className="text-lg font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
            <p className="text-xs text-gray-400">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <Card className="text-center py-4">
            <p className="text-red-500 text-sm">Failed to load dashboard data</p>
          </Card>
        )}

        {/* Employee Dashboard */}
        {stats?.role === 'EMPLOYEE' && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Today's Attendance</h3>
              <Card>
                {stats.todayAttendance ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge status={stats.todayAttendance.status} />
                      <p className="text-xs text-gray-500 mt-1">
                        In: {formatTime(stats.todayAttendance.checkInTime)} | Out: {formatTime(stats.todayAttendance.checkOutTime)}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/attendance')}>View</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Not checked in yet</p>
                    <Button size="sm" onClick={() => navigate('/attendance')}>Check In</Button>
                  </div>
                )}
              </Card>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Leave Balances</h3>
              <div className="space-y-2">
                {(stats.leaveBalances || []).slice(0, 3).map((b) => (
                  <Card key={b.id} className="py-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-800">{b.leaveType?.name}</span>
                      <span className="text-sm font-bold text-indigo-600">{b.remaining} days</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(b.used / b.allocated) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{b.used} used of {b.allocated}</p>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={CheckSquare} label="Pending Tasks" value={stats.pendingTasks} color="orange" onClick={() => navigate('/projects')} />
              <StatCard icon={Bell} label="Notifications" value={stats.unreadNotifications} color="purple" onClick={() => navigate('/notifications')} />
            </div>
          </>
        )}

        {/* Manager Dashboard */}
        {stats?.role === 'MANAGER' && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Team Size" value={stats.teamSize} color="blue" onClick={() => navigate('/team')} />
            <StatCard icon={Clock} label="Present Today" value={stats.teamPresentToday} color="green" />
            <StatCard icon={CheckSquare} label="Pending Approvals" value={stats.pendingLeaveApprovals} color="orange" onClick={() => navigate('/approvals')} />
            <StatCard icon={Briefcase} label="Active Projects" value={stats.activeProjects} color="purple" onClick={() => navigate('/projects')} />
          </div>
        )}

        {/* HR Dashboard */}
        {stats?.role === 'HR' && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Total Employees" value={stats.totalEmployees} color="blue" />
            <StatCard icon={Calendar} label="On Leave Today" value={stats.leavesToday} color="orange" />
            <StatCard icon={DollarSign} label="Payroll Processed" value={stats.payrollStatus} color="green" onClick={() => navigate('/payroll')} />
            <StatCard icon={CheckSquare} label="Pending Approvals" value={stats.pendingApprovals} color="red" onClick={() => navigate('/approvals')} />
          </div>
        )}

        {/* Admin Dashboard */}
        {stats?.role === 'ADMIN' && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Total Employees" value={stats.totalEmployees} color="blue" />
            <StatCard icon={Briefcase} label="Active Projects" value={stats.activeProjects} color="purple" onClick={() => navigate('/projects')} />
            <StatCard icon={CheckSquare} label="Pending Approvals" value={stats.pendingApprovals} color="orange" onClick={() => navigate('/approvals')} />
            <StatCard icon={TrendingUp} label="Departments" value={stats.totalDepartments} color="green" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
