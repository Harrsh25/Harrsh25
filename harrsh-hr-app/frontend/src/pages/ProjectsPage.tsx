import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { getAllProjects } from '../api/projects';
import useAuth from '../hooks/useAuth';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton';
import { formatDate } from '../utils/formatters';
import { isToday, parseISO } from 'date-fns';
import clsx from 'clsx';

const statusFilters = ['ALL', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

const ProjectsPage = () => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = ['MANAGER', 'ADMIN', 'HR'].includes(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () => getAllProjects({ ...(statusFilter !== 'ALL' && { status: statusFilter }) }),
  });

  const projects = data?.data?.projects || [];

  const filteredProjects = useMemo(() =>
    projects?.filter(p => statusFilter === 'ALL' || p.status === statusFilter) ?? [],
    [projects, statusFilter]
  );

  const priorityColors = { LOW: 'bg-gray-100', MEDIUM: 'bg-blue-50', HIGH: 'bg-orange-50', CRITICAL: 'bg-red-50' };

  return (
    <div>
      <Header
        title="Projects"
        rightAction={canCreate && (
          <Button size="sm" onClick={() => navigate('/projects/new')} className="gap-1">
            <Plus size={16} /> New
          </Button>
        )}
      />
      <div className="p-4 space-y-4">
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {statusFilters.map((s) => (
            <div key={s} className="min-h-[44px] flex items-center">
              <button
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {s.replace(/_/g, ' ')}
              </button>
            </div>
          ))}
        </div>

        {isLoading ? (
          <SkeletonList count={4} />
        ) : filteredProjects.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No projects found" subtitle="Projects will appear here once created" />
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => {
              const isDueToday = project.endDate && (() => { try { return isToday(parseISO(project.endDate)); } catch { return false; } })();
              return (
                <Card key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className={priorityColors[project.priority] || ''}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
                      {project.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge status={project.status} />
                      <Badge status={project.priority} size="sm" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium text-gray-700">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{project._count?.tasks || 0} tasks</span>
                    <div className="flex items-center gap-1.5">
                      {isDueToday && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                      <span>{project.endDate ? `Due ${formatDate(project.endDate)}` : 'No deadline'}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
