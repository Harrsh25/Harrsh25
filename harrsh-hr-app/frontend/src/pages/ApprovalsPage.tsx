import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { getPendingApprovals, approveRequest, rejectRequest } from '../api/approvals';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import NoApprovals from '../components/ui/illustrations/NoApprovals';
import { SkeletonList } from '../components/ui/Skeleton';
import { formatDate, formatRelativeTime } from '../utils/formatters';
import useToast from '../hooks/useToast';
import clsx from 'clsx';

const getPendingApprovalsDirect = (params) => getPendingApprovals(params);
const approveRequestDirect = (id, data) => approveRequest(id, data);
const rejectRequestDirect = (id, data) => rejectRequest(id, data);

const TYPE_FILTERS = ['ALL', 'LEAVE', 'EXPENSE', 'TRAVEL'];
const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

const ApprovalsPage = () => {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('All');
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', 'pending', typeFilter],
    queryFn: () => getPendingApprovalsDirect({ ...(typeFilter !== 'ALL' && { type: typeFilter }) }),
  });

  const approveMutation = useMutation<any, Error, { id: any }>({
    mutationFn: ({ id }) => approveRequestDirect(id, {}),
    onSuccess: () => { toast.success('Request approved'); queryClient.invalidateQueries({ queryKey: ['approvals'] }); },
    onError: (err: any) => toast.error((err as any).response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation<any, Error, { id: any }>({
    mutationFn: ({ id }) => rejectRequestDirect(id, {}),
    onSuccess: () => { toast.success('Request rejected'); queryClient.invalidateQueries({ queryKey: ['approvals'] }); },
    onError: (err: any) => toast.error((err as any).response?.data?.message || 'Failed to reject'),
  });

  const handleApprove = (id: any) => {
    if (window.confirm('Approve this request?')) approveMutation.mutate({ id });
  };

  const handleReject = (id: any) => {
    if (window.confirm('Reject this request?')) rejectMutation.mutate({ id });
  };

  const allApprovals = data?.data?.approvals || [];

  const filteredApprovals = useMemo(() => {
    if (!allApprovals.length) return [];
    return allApprovals.filter(a => {
      if (statusFilter === 'All') return true;
      return a.status === statusFilter.toUpperCase();
    });
  }, [allApprovals, statusFilter]);

  const pendingCount = useMemo(
    () => allApprovals.filter(a => a.status === 'PENDING' || !a.status).length,
    [allApprovals]
  );

  return (
    <div>
      <Header
        title={
          <span className="flex items-center gap-1">
            Approvals
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 ml-2">
                {pendingCount}
              </span>
            )}
          </span>
        }
      />
      <div className="p-4 space-y-4">
        {/* Type Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={clsx(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                typeFilter === t ? 'bg-[#1a56db] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={clsx(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                statusFilter === f
                  ? 'bg-[#1a56db] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonList rows={3} />
        ) : filteredApprovals.length === 0 ? (
          <EmptyState
            icon={<NoApprovals className="w-28 h-28" />}
            title="No pending approvals"
            subtitle="When someone requests leave or an expense, it will appear here"
          />
        ) : (
          <div className="space-y-3">
            {filteredApprovals.map((approval) => (
              <Card key={approval.id}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar
                    firstName={approval.requestedBy?.firstName}
                    lastName={approval.requestedBy?.lastName}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {approval.requestedBy?.firstName} {approval.requestedBy?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{approval.requestedBy?.department}</p>
                  </div>
                  <Badge status={approval.requestType === 'LEAVE' ? 'blue' : 'gray'}>
                    {approval.requestType}
                  </Badge>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-700">{approval.requestType}</span>
                  </div>
                  {approval.comments && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Notes</span>
                      <span className="font-medium text-gray-700 text-right max-w-[60%]">{approval.comments}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Submitted</span>
                    <span className="font-medium text-gray-700">{formatRelativeTime(approval.createdAt)}</span>
                  </div>
                </div>

                {/* Inline quick approve/reject for pending items */}
                {(!approval.status || approval.status === 'PENDING') && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleApprove(approval.id)}
                      className="flex-1 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(approval.id)}
                      className="flex-1 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}

                {/* Show status badge for non-pending items */}
                {approval.status && approval.status !== 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="destructive" className="flex-1 gap-1"
                      loading={rejectMutation.isPending}
                      onClick={() => handleReject(approval.id)}
                    >
                      <X size={14} /> Reject
                    </Button>
                    <Button
                      size="sm" variant="success" className="flex-1 gap-1"
                      loading={approveMutation.isPending}
                      onClick={() => handleApprove(approval.id)}
                    >
                      <Check size={14} /> Approve
                    </Button>
                  </div>
                )}

                {/* Fallback for items with no status (treat as pending with full buttons) */}
                {approval.status === undefined && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm" variant="destructive" className="flex-1 gap-1"
                      loading={rejectMutation.isPending}
                      onClick={() => handleReject(approval.id)}
                    >
                      <X size={14} /> Reject
                    </Button>
                    <Button
                      size="sm" variant="success" className="flex-1 gap-1"
                      loading={approveMutation.isPending}
                      onClick={() => handleApprove(approval.id)}
                    >
                      <Check size={14} /> Approve
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalsPage;
