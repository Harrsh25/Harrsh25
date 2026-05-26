import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Check, X } from 'lucide-react';
import { getPendingApprovals, approveRequest, rejectRequest } from '../api/approvals.js';
import Header from '../components/layout/Header.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonList } from '../components/ui/Skeleton.jsx';
import { formatDate, formatRelativeTime } from '../utils/formatters.js';
import useToast from '../hooks/useToast.js';
import clsx from 'clsx';

const getPendingApprovalsDirect = (params) => getPendingApprovals(params);
const approveRequestDirect = (id, data) => approveRequest(id, data);
const rejectRequestDirect = (id, data) => rejectRequest(id, data);

const typeFilters = ['ALL', 'LEAVE', 'EXPENSE', 'TRAVEL'];

const ApprovalsPage = () => {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', 'pending', typeFilter],
    queryFn: () => getPendingApprovalsDirect({ ...(typeFilter !== 'ALL' && { type: typeFilter }) }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id }) => approveRequestDirect(id, {}),
    onSuccess: () => { toast.success('Request approved'); queryClient.invalidateQueries({ queryKey: ['approvals'] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id }) => rejectRequestDirect(id, {}),
    onSuccess: () => { toast.success('Request rejected'); queryClient.invalidateQueries({ queryKey: ['approvals'] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reject'),
  });

  const approvals = data?.data?.approvals || [];

  return (
    <div>
      <Header title="Approvals" />
      <div className="p-4 space-y-4">
        {/* Type Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {typeFilters.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonList count={3} />
        ) : approvals.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No pending approvals" subtitle="All requests have been reviewed" />
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => (
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
                  <Badge status={approval.requestType === 'LEAVE' ? 'blue' : 'gray'} color="blue">
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

                <div className="flex gap-2">
                  <Button
                    size="sm" variant="destructive" className="flex-1 gap-1"
                    loading={rejectMutation.isPending}
                    onClick={() => { if (window.confirm('Reject this request?')) rejectMutation.mutate({ id: approval.id }); }}
                  >
                    <X size={14} /> Reject
                  </Button>
                  <Button
                    size="sm" variant="success" className="flex-1 gap-1"
                    loading={approveMutation.isPending}
                    onClick={() => { if (window.confirm('Approve this request?')) approveMutation.mutate({ id: approval.id }); }}
                  >
                    <Check size={14} /> Approve
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalsPage;
