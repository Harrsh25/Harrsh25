import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import api from '../api/axios.js';
import useAuth from '../hooks/useAuth.js';
import Header from '../components/layout/Header.jsx';
import Card from '../components/ui/Card.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonList } from '../components/ui/Skeleton.jsx';
import { formatDate } from '../utils/formatters.js';

const TeamPage = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['team', user?.id],
    queryFn: () => api.get(`/users/${user?.id}/direct-reports`).then(r => r.data),
    enabled: !!user?.id,
  });

  const team = data?.data || [];

  return (
    <div>
      <Header title="My Team" />
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-500">{team.length} direct reports</p>
        {isLoading ? (
          <SkeletonList count={5} />
        ) : team.length === 0 ? (
          <EmptyState icon={Users} title="No direct reports" subtitle="Your team members will appear here" />
        ) : (
          team.map((member) => (
            <Card key={member.id} className="flex items-center gap-3">
              <Avatar firstName={member.firstName} lastName={member.lastName} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{member.firstName} {member.lastName}</p>
                <p className="text-xs text-gray-500">{member.designation || member.role}</p>
                <p className="text-xs text-gray-400">{member.employeeId} • Joined {formatDate(member.joinDate)}</p>
              </div>
              <Badge status={member.status || 'ACTIVE'} />
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamPage;
