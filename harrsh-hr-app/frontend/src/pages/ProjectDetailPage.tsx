import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjectById } from '../api/projects';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { formatDate, formatCurrency } from '../utils/formatters';
import { CheckSquare } from 'lucide-react';
import clsx from 'clsx';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProjectById(id),
    enabled: !!id,
  });

  const project = data?.data;

  if (isLoading) return (
    <div>
      <Header title="Loading..." showBack />
      <div className="p-4 space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
    </div>
  );

  if (error || !project) return (
    <div>
      <Header title="Project" showBack />
      <div className="p-4">
        <Card className="text-center py-8">
          <p className="text-red-500 text-sm">Failed to load project</p>
        </Card>
      </div>
    </div>
  );

  const tasks = project.tasks || [];
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <div>
      <Header title={project.name} showBack />
      <div className="p-4 space-y-4">
        {/* Project Header */}
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h2 className="text-lg font-bold">{project.name}</h2>
              {project.description && <p className="text-indigo-200 text-sm mt-1">{project.description}</p>}
            </div>
            <Badge status={project.status} />
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-indigo-200">Progress</span>
              <span className="font-semibold">{project.progress}%</span>
            </div>
            <div className="w-full bg-indigo-800 rounded-full h-2">
              <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-indigo-200">
            <span>{tasks.length} tasks • {completedTasks} completed</span>
            <Badge status={project.priority} />
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {[['overview', 'Overview'], ['tasks', 'Tasks'], ['team', 'Team']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Project Details</h3>
            <div className="space-y-3">
              {[
                { label: 'Status', value: <Badge status={project.status} /> },
                { label: 'Priority', value: <Badge status={project.priority} /> },
                { label: 'Manager', value: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : '—' },
                { label: 'Start Date', value: formatDate(project.startDate) },
                { label: 'End Date', value: formatDate(project.endDate) },
                { label: 'Budget', value: project.budget ? formatCurrency(project.budget) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="No tasks yet" subtitle="Tasks will appear here once added" />
            ) : tasks.map((task) => (
              <Card key={task.id}>
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    task.status === 'COMPLETED' ? 'bg-green-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-gray-300'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-medium', task.status === 'COMPLETED' && 'line-through text-gray-400')}>{task.title}</p>
                    {task.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {task.assignedTo && (
                        <span className="text-xs text-gray-500">{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
                      )}
                      {task.dueDate && <span className="text-xs text-gray-400">Due {formatDate(task.dueDate)}</span>}
                    </div>
                  </div>
                  <Badge status={task.status} />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="space-y-2">
            {project.manager && (
              <Card className="flex items-center gap-3">
                <Avatar firstName={project.manager.firstName} lastName={project.manager.lastName} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{project.manager.firstName} {project.manager.lastName}</p>
                  <p className="text-xs text-gray-500">Project Manager</p>
                </div>
              </Card>
            )}
            {[...new Set(tasks.filter(t => t.assignedTo).map(t => t.assignedTo.id))].map(uid => {
              const member = tasks.find(t => t.assignedTo?.id === uid)?.assignedTo;
              const memberTasks = tasks.filter(t => t.assignedTo?.id === uid);
              return (
                <Card key={uid as string} className="flex items-center gap-3">
                  <Avatar firstName={member.firstName} lastName={member.lastName} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-gray-500">{memberTasks.length} tasks assigned</p>
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

export default ProjectDetailPage;
