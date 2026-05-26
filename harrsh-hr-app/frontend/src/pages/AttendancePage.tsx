import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, LogIn, LogOut, Calendar, Loader2 } from 'lucide-react';
import { checkIn, checkOut, getMyAttendance, getAttendanceSummary } from '../api/attendance';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { formatTime, formatDate, formatDuration } from '../utils/formatters';
import useToast from '../hooks/useToast';

const StatusBar = ({ label, value, max, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  </div>
);

const AttendancePage = () => {
  const [now, setNow] = useState(new Date());
  const [locationLoading, setLocationLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [successTime, setSuccessTime] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', 'me'],
    queryFn: () => getMyAttendance({ limit: 30 }),
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['attendance', 'summary'],
    queryFn: () => getAttendanceSummary({}),
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = attendanceData?.data?.records?.find(
    (r) => format(new Date(r.date), 'yyyy-MM-dd') === todayStr
  );

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      setSuccessTime(`Checked in at ${timeStr}`);
      setCheckInSuccess(true);
      setTimeout(() => setCheckInSuccess(false), 4000);
      toast.success('Checked in successfully!');
      if (navigator.vibrate) navigator.vibrate(50);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => toast.error((err as any).response?.data?.message || 'Check-in failed'),
  });

  const handleCheckIn = async () => {
    setLocationLoading(true);
    try {
      let locationData = {};
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          );
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (geoErr: any) {
          if ((geoErr as any).code === 1) {
            toast.error('Location access denied. Please enable GPS.');
            setLocationLoading(false);
            return;
          }
          // GPS optional if not required by org - continue without
        }
      }
      await checkInMutation.mutateAsync(locationData);
    } catch (err: any) {
      toast.error((err as any).response?.data?.message || 'Check-in failed');
    } finally {
      setLocationLoading(false);
    }
  };

  const checkOutMutation = useMutation({
    mutationFn: checkOut,
    onSuccess: () => {
      if (navigator.vibrate) navigator.vibrate(50);
      toast.success('Checked out successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => toast.error((err as any).response?.data?.message || 'Check-out failed'),
  });

  const hasCheckedIn = !!todayRecord?.checkInTime;
  const hasCheckedOut = !!todayRecord?.checkOutTime;
  const isCheckInLoading = checkInMutation.isPending || locationLoading;
  const isCheckOutLoading = checkOutMutation.isPending;
  const summary = summaryData?.data?.summary || {};
  const records = attendanceData?.data?.records || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Attendance" />

      {/* Hero Section — clock + status */}
      <div className="bg-gradient-to-b from-[#1a56db] to-[#1e40af] text-white px-4 pt-8 pb-6">
        {/* Real-time clock */}
        <div className="text-center mb-6">
          <p className="text-5xl font-bold tabular-nums tracking-tight">
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-blue-200 text-sm mt-1">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {/* Today's status badge */}
        {todayRecord && (
          <div className="flex justify-center mb-4">
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {todayRecord.status}
              {todayRecord.checkInTime && ` · In at ${new Date(todayRecord.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
        )}
        {!todayRecord && (
          <div className="flex justify-center mb-4">
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
              NOT YET CHECKED IN
            </span>
          </div>
        )}
      </div>

      {/* Check In / Check Out button */}
      <div className="px-4 -mt-3">
        {!hasCheckedIn ? (
          <button
            onClick={handleCheckIn}
            disabled={isCheckInLoading}
            className="w-full h-16 rounded-2xl font-semibold text-base shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3 bg-white text-[#1a56db] border border-blue-100 disabled:opacity-60"
          >
            {isCheckInLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <LogIn size={20} />
            )}
            {isCheckInLoading ? 'Locating...' : 'Check In'}
          </button>
        ) : !hasCheckedOut ? (
          <button
            onClick={() => checkOutMutation.mutate({})}
            disabled={isCheckOutLoading}
            className="w-full h-16 rounded-2xl font-semibold text-base shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3 bg-red-500 text-white disabled:opacity-60"
          >
            {isCheckOutLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <LogOut size={20} />
            )}
            {isCheckOutLoading ? 'Checking out...' : 'Check Out'}
          </button>
        ) : (
          <div className="w-full h-16 rounded-2xl font-semibold text-base shadow-sm flex items-center justify-center gap-3 bg-gray-100 text-gray-400 border border-gray-200">
            <Clock size={20} />
            Day Complete · Out at {formatTime(todayRecord?.checkOutTime)}
          </div>
        )}
      </div>

      {/* Success Card */}
      {checkInSuccess && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 animate-[slideUp_0.22s_ease-out]">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-green-600 font-bold text-lg">
            ✓
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Checked in successfully</p>
            <p className="text-xs text-green-600">{successTime}</p>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Today Status Card */}
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
                <p className="text-sm font-semibold text-gray-800">
                  {formatTime(todayRecord.checkInTime)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Hours</p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatDuration(todayRecord.workingHours)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Monthly Summary */}
        {!summaryLoading && (
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Summary</h3>
            <div className="space-y-3">
              <StatusBar
                label="Present"
                value={summary.PRESENT || 0}
                max={26}
                color="bg-green-500"
              />
              <StatusBar label="Absent" value={summary.ABSENT || 0} max={26} color="bg-red-500" />
              <StatusBar label="Late" value={summary.LATE || 0} max={26} color="bg-yellow-500" />
              <StatusBar
                label="Half Day"
                value={summary.HALF_DAY || 0}
                max={26}
                color="bg-orange-500"
              />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Working Hours</span>
                <span className="font-semibold text-gray-800">
                  {formatDuration(summaryData?.data?.totalWorkingHours)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Attendance History — collapsible */}
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center justify-between w-full px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm font-semibold text-gray-700"
          >
            <span>View History</span>
            <span className="text-gray-400">{showHistory ? '▲' : '▾'}</span>
          </button>
          {showHistory && (
            <div className="mt-2">
              {attendanceLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {records.slice(0, 20).map((record) => (
                    <Card key={record.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Calendar size={14} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{formatDate(record.date)}</p>
                          <p className="text-xs text-gray-400">
                            {record.checkInTime
                              ? `${formatTime(record.checkInTime)} — ${formatTime(record.checkOutTime)}`
                              : 'No record'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.workingHours && (
                          <span className="text-xs text-gray-500">
                            {formatDuration(record.workingHours)}
                          </span>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
