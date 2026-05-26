import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { getMyNotifications, markAsRead, markAllRead } from '../api/notifications.js';
import Header from '../components/layout/Header.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonList } from '../components/ui/Skeleton.jsx';
import { formatRelativeTime } from '../utils/formatters.js';
import useToast from '../hooks/useToast.js';
import useAppStore from '../store/appStore.js';
import clsx from 'clsx';
import { isToday, parseISO } from 'date-fns';

const typeColors = { INFO: 'bg-blue-500', SUCCESS: 'bg-green-500', WARNING: 'bg-yellow-500', ERROR: 'bg-red-500' };

const NotificationsPage = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const setNotificationCount = useAppStore(s => s.setNotificationCount);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getMyNotifications({ limit: 50 }),
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      toast.success('All notifications marked as read');
      setNotificationCount(0);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.data?.notifications || [];
  const todayNotifs = notifications.filter(n => {
    try { return isToday(parseISO(n.createdAt)); } catch { return false; }
  });
  const earlierNotifs = notifications.filter(n => {
    try { return !isToday(parseISO(n.createdAt)); } catch { return true; }
  });

  const hasUnread = notifications.some(n => !n.isRead);

  const NotifItem = ({ notification }) => (
    <div
      className={clsx('flex items-start gap-3 p-3 rounded-2xl transition-colors cursor-pointer', notification.isRead ? 'bg-white' : 'bg-indigo-50')}
      onClick={() => { if (!notification.isRead) markReadMutation.mutate(notification.id); }}
    >
      <div className={clsx('w-2 h-2 rounded-full mt-2 flex-shrink-0', typeColors[notification.type] || 'bg-blue-500')} />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm', notification.isRead ? 'font-normal text-gray-700' : 'font-semibold text-gray-900')}>{notification.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      {!notification.isRead && <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />}
    </div>
  );

  return (
    <div>
      <Header
        title="Notifications"
        rightAction={hasUnread && (
          <Button size="sm" variant="ghost" onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending} className="gap-1 text-xs">
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      />
      <div className="p-4 space-y-4">
        {isLoading ? (
          <SkeletonList count={5} />
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" subtitle="You're all caught up!" />
        ) : (
          <>
            {todayNotifs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Today</p>
                <Card className="p-0 divide-y divide-gray-50">
                  {todayNotifs.map(n => <NotifItem key={n.id} notification={n} />)}
                </Card>
              </div>
            )}
            {earlierNotifs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Earlier</p>
                <Card className="p-0 divide-y divide-gray-50">
                  {earlierNotifs.map(n => <NotifItem key={n.id} notification={n} />)}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
