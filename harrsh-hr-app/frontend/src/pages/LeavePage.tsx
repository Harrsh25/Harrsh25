import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar } from 'lucide-react';
import { getMyLeaves, getLeaveBalance, getPendingApprovals, approveLeave, rejectLeave } from '../api/leave';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton';
import { formatDate } from '../utils/formatters';

const LeavePage = () => {
  const [activeTab, setActiveTab] = useState('my');
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isManager = ['MANAGER', 'HR', 'ADMIN'].includes(user?.role);

  const { data: balanceData } = useQuery({ queryKey: ['leave', 'balance'], queryFn: getLeaveBalance });
  const { data: myLeavesData, isLoading: myLoading } = useQuery({ queryKey: ['leave', 'my'], queryFn: () => getMyLeaves() });
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['leave', 'pending'],
    queryFn: getPendingApprovals,
    enabled: isManager,
  });

  const approveMutation = useMutation<any, Error, { id: any; comment?: string }>({
    mutationFn: ({ id, comment }) => approveLeave(id, { comment }),
    onSuccess: () => { toast.success('Leave approved'); queryClient.invalidateQueries({ queryKey: ['leave'] }); },
    onError: (err: any) => toast.error((err as any).response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation<any, Error, { id: any; comment?: string }>({
    mutationFn: ({ id, comment }) => rejectLeave(id, { comment }),
    onSuccess: () => { toast.success('Leave rejected'); queryClient.invalidateQueries({ queryKey: ['leave'] }); },
    onError: (err: any) => toast.error((err as any).response?.data?.message || 'Failed to reject'),
  });

  const balances = balanceData?.data || [];
  const myLeaves = myLeavesData?.data?.leaves || [];
  const pendingLeaves = pendingData?.data?.leaves || [];

  const filteredMyLeaves = useMemo(() =>
    myLeaves ?? [],
    [myLeaves]
  );

  return (
    <div>
      <Header
        title="Leave"
        rightAction={
          <Button size="sm" onClick={() => navigate('/leave/apply')} className="gap-1">
            <Plus size={16} /> Apply
          </Button>
        }
      />

      {/* Sticky leave balance summary */}
      {balances.length > 0 && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 pb-3">
          <div className="px-4 pt-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Leave Balance</h3>
            <div className="grid grid-cols-2 gap-2">
              {balances.map((b) => (
                <Card key={b.id} className="py-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-medium text-gray-700 leading-tight pr-1">{b.leaveType?.name}</p>
                    <span className="text-lg font-bold text-[#1a56db] flex-shrink-0">{b.remaining}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{b.used} used</span>
                      <span>{b.remaining} remaining</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (b.used / b.allocated) * 100)}%`,
                          backgroundColor: b.leaveType?.color || '#1a56db',
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{b.used}/{b.allocated} used</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Tabs */}
        {isManager && (
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {[['my', 'My Leaves'], ['pending', `Pending (${pendingLeaves.length})`]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-white text-[#1a56db] shadow-sm' : 'text-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* My Leaves Tab */}
        {activeTab === 'my' && (
          <div>
            {myLoading ? <SkeletonList rows={3} /> : filteredMyLeaves.length === 0 ? (
              <EmptyState icon={<Calendar size={32} />} title="No leaves yet" subtitle="Apply for leave when you need time off" onAction={() => navigate('/leave/apply')} actionLabel="Apply Leave" />
            ) : (
              <div className="space-y-2">
                {filteredMyLeaves.map((leave) => (
                  <Card key={leave.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{leave.leaveType?.name}</span>
                          <Badge status={leave.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(leave.startDate)} — {formatDate(leave.endDate)} ({leave.totalDays} days)
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{leave.reason}</p>
                        {leave.approverComment && (
                          <p className="text-xs text-gray-500 mt-1 italic">Note: {leave.approverComment}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Approvals Tab */}
        {activeTab === 'pending' && isManager && (
          <div>
            {pendingLoading ? <SkeletonList rows={3} /> : pendingLeaves.length === 0 ? (
              <EmptyState icon={<Calendar size={32} />} title="No pending approvals" subtitle="All leave requests have been reviewed" />
            ) : (
              <div className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <Card key={leave.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar firstName={leave.user?.firstName} lastName={leave.user?.lastName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{leave.user?.firstName} {leave.user?.lastName}</p>
                        <p className="text-xs text-gray-500">{leave.user?.department} • {leave.user?.employeeId}</p>
                      </div>
                      <Badge status="PENDING" />
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Leave Type</span>
                        <span className="font-medium text-gray-700">{leave.leaveType?.name}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-medium text-gray-700">{formatDate(leave.startDate)} — {formatDate(leave.endDate)} ({leave.totalDays}d)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Reason</span>
                        <span className="font-medium text-gray-700 text-right max-w-[60%] line-clamp-2">{leave.reason}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm" variant="destructive" className="flex-1"
                        loading={rejectMutation.isPending}
                        onClick={() => { if (window.confirm('Reject this leave?')) rejectMutation.mutate({ id: leave.id }); }}
                      >Reject</Button>
                      <Button
                        size="sm" variant="success" className="flex-1"
                        loading={approveMutation.isPending}
                        onClick={() => { if (window.confirm('Approve this leave?')) approveMutation.mutate({ id: leave.id }); }}
                      >Approve</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeavePage;
