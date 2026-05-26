import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react';
import { checkIn, checkOut, getMyAttendance, getAttendanceSummary } from '../api/attendance.js';
import Header from '../components/layout/Header.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import { SkeletonCard } from '../components/ui/Skeleton.jsx';
import { formatTime, formatDate, formatDuration } from '../utils/formatters.js';
import useToast from '../hooks/useToast.js';

const AttendancePage = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', 'me'],
    queryFn: () => getMyAttendance({ limit: 30 }),
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['attendance', 'summary'],
    queryFn: () => getAttendanceSummary(),
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = attendanceData?.data?.records?.find(r =>
    format(new Date(r.date), 'yyyy-MM-dd') === todayStr
  );

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      toast.success('Checked in successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Check-in failed'),
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOut,
    onSuccess: () => {
      toast.success('Checked out successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Check-out failed'),
  });

  const hasCheckedIn = !!todayRecord?.checkInTime;
  const hasCheckedOut = !!todayRecord?.checkOutTime;
  const summary = summaryData?.data?.summary || {};
  const records = attendanceData?.data?.records || [];

  const StatusBar = ({ label, value, max, color }) => (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
      </div>
    </div>
  );

  return (
    <div>
      <Header title="Attendance" />
      <div className="p-4 space-y-4">
        {/* Current Time */}
        <Card className="text-center py-6">
          <p className="text-4xl font-bold text-gray-900 tabular-nums">{format(currentTime, 'hh:mm:ss')}</p>
          <p className="text-sm text-gray-500 mt-1">{format(currentTime, 'EEEE, dd MMMM yyyy')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{format(currentTime, 'a')}</p>
        </Card>

        {/* Check In/Out */}
        <div className="flex gap-3">
          <Button
            size="full"
            variant="primary"
            onClick={() => checkInMutation.mutate()}
            loading={checkInMutation.isPending}
            disabled={hasCheckedIn}
            className="flex-1 h-14 text-base gap-2"
          >
            <LogIn size={20} />
            {hasCheckedIn ? `In: ${formatTime(todayRecord.checkInTime)}` : 'Check In'}
          </Button>
          <Button
            size="full"
            variant={hasCheckedOut ? 'secondary' : 'destructive'}
            onClick={() => checkOutMutation.mutate()}
            loading={checkOutMutation.isPending}
            disabled={!hasCheckedIn || hasCheckedOut}
            className="flex-1 h-14 text-base gap-2"
          >
            <LogOut size={20} />
            {hasCheckedOut ? `Out: ${formatTime(todayRecord.checkOutTime)}` : 'Check Out'}
          </Button>
        </div>

        {/* Today Status */}
        {todayRecord && (
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Today's Summary</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge status={todayRecord.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Check In</p>
                <p className="text-sm font-semibold text-gray-800">{formatTime(todayRecord.checkInTime)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Hours</p>
                <p className="text-sm font-semibold text-gray-800">{formatDuration(todayRecord.workingHours)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Monthly Summary */}
        {!summaryLoading && (
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Summary</h3>
            <div className="space-y-3">
              <StatusBar label="Present" value={summary.PRESENT || 0} max={26} color="bg-green-500" />
              <StatusBar label="Absent" value={summary.ABSENT || 0} max={26} color="bg-red-500" />
              <StatusBar label="Late" value={summary.LATE || 0} max={26} color="bg-yellow-500" />
              <StatusBar label="Half Day" value={summary.HALF_DAY || 0} max={26} color="bg-orange-500" />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Working Hours</span>
                <span className="font-semibold text-gray-800">{formatDuration(summaryData?.data?.totalWorkingHours)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Attendance History */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Attendance History</h3>
          {attendanceLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="space-y-2">
              {records.slice(0, 20).map((record) => (
                <Card key={record.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Calendar size={14} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{formatDate(record.date)}</p>
                      <p className="text-xs text-gray-400">
                        {record.checkInTime ? `${formatTime(record.checkInTime)} — ${formatTime(record.checkOutTime)}` : 'No record'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.workingHours && (
                      <span className="text-xs text-gray-500">{formatDuration(record.workingHours)}</span>
                    )}
                    <Badge status={record.status} />
                  </div>
                </Card>
              ))}
              {records.length === 0 && (
                <Card className="text-center py-8">
                  <Clock size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No attendance records yet</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
