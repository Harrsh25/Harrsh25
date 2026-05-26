import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, BarChart2, Calendar, Users, TrendingUp, FileSpreadsheet } from 'lucide-react';
import {
  getAttendanceReport, downloadAttendancePDF, downloadAttendanceExcel,
  getLeaveReport, downloadLeaveExcel,
  getPayrollReport, downloadPayrollExcel,
} from '../api/reports';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import clsx from 'clsx';

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const TABS = ['Attendance', 'Leave', 'Payroll'];

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  trend?: number; // positive = up, negative = down
}

const StatCard = ({ label, value, color, trend }: StatCardProps) => (
  <div className={clsx('rounded-xl p-3 text-center', color)}>
    <p className="text-xs font-medium opacity-75">{label}</p>
    <p className="text-2xl font-bold mt-0.5">{value}</p>
    {trend !== undefined && (
      <p className={clsx('text-xs mt-0.5 font-medium', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
      </p>
    )}
  </div>
);

const ReportsPage = () => {
  const now = new Date();
  const [activeTab, setActiveTab] = useState('Attendance');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [leaveYear, setLeaveYear] = useState(String(now.getFullYear()));
  const [downloading, setDownloading] = useState(null);
  const toast = useToast();

  // ── Attendance report ──
  const { data: attData, isLoading: attLoading } = useQuery({
    queryKey: ['report', 'attendance', month, year],
    queryFn: () => getAttendanceReport({ month, year }),
    enabled: activeTab === 'Attendance',
  });

  // ── Leave report ──
  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ['report', 'leave', leaveYear],
    queryFn: () => getLeaveReport({ year: leaveYear }),
    enabled: activeTab === 'Leave',
  });

  // ── Payroll report ──
  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['report', 'payroll', month, year],
    queryFn: () => getPayrollReport({ month, year }),
    enabled: activeTab === 'Payroll',
  });

  const handleDownload = async (fetchFn, filename, key) => {
    setDownloading(key);
    try {
      const res = await fetchFn();
      triggerDownload(new Blob([res.data]), filename);
      toast.success('File downloaded successfully');
    } catch {
      toast.error('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const attRecords = attData?.data?.records || [];
  const leaveRequests = leaveData?.data?.requests || [];
  const payrollRecords = payrollData?.data?.records || [];

  const attPresent = attRecords.filter(r => r.status === 'PRESENT').length;
  const attAbsent = attRecords.filter(r => r.status === 'ABSENT').length;
  const attLate = attRecords.filter(r => r.status === 'LATE').length;

  const leaveApproved = leaveRequests.filter(r => r.status === 'APPROVED').length;
  const leavePending = leaveRequests.filter(r => r.status === 'PENDING').length;
  const leaveRejected = leaveRequests.filter(r => r.status === 'REJECTED').length;

  const totalNet = payrollData?.data?.totalNetSalary || 0;
  const totalGross = payrollData?.data?.totalGrossSalary || 0;

  return (
    <div>
      <Header title="Reports & Analytics" />
      <div className="p-4 space-y-4 pb-24">

        {/* Tab selector */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-colors',
                activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Date range context */}
        <p className="text-xs text-gray-400 text-center -mt-2 mb-2">
          {activeTab === 'Leave'
            ? `Showing leave data for ${leaveYear}`
            : `Showing data for ${MONTHS.find(m => m.value === month)?.label} ${year}`}
        </p>

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === 'Attendance' && (
          <>
            {/* Filters */}
            <Card>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filters</p>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  options={MONTHS}
                />
                <Select
                  label="Year"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  options={YEARS}
                />
              </div>
            </Card>

            {/* Stats */}
            {attLoading ? (
              <SkeletonCard />
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <StatCard label="Total" value={attRecords.length} color="bg-indigo-50 text-indigo-700" />
                <StatCard label="Present" value={attPresent} color="bg-green-50 text-green-700" trend={5} />
                <StatCard label="Absent" value={attAbsent} color="bg-red-50 text-red-700" trend={-2} />
                <StatCard label="Late" value={attLate} color="bg-amber-50 text-amber-700" />
              </div>
            )}

            {/* Download buttons */}
            <Card>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Export Report</p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  loading={downloading === 'att-pdf'}
                  onClick={() => handleDownload(
                    () => downloadAttendancePDF({ month, year }),
                    `attendance-${month}-${year}.pdf`,
                    'att-pdf'
                  )}
                >
                  <FileText size={16} />
                  Download PDF
                </Button>
                <Button
                  variant="secondary"
                  loading={downloading === 'att-excel'}
                  onClick={() => handleDownload(
                    () => downloadAttendanceExcel({ month, year }),
                    `attendance-${month}-${year}.xlsx`,
                    'att-excel'
                  )}
                >
                  <FileSpreadsheet size={16} />
                  Download Excel
                </Button>
              </div>
            </Card>

            {/* Empty state */}
            {!attLoading && attRecords.length === 0 && (
              <EmptyState
                icon="📊"
                title="No attendance records"
                subtitle={`No data found for ${MONTHS.find(m => m.value === month)?.label} ${year}`}
              />
            )}

            {/* Records preview */}
            {!attLoading && attRecords.length > 0 && (
              <Card>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Preview ({attRecords.length} records)
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attRecords.slice(0, 20).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {r.user?.firstName} {r.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(r.date).toLocaleDateString('en-IN')}</p>
                      </div>
                      <span className={clsx(
                        'text-xs font-bold px-2 py-0.5 rounded-full',
                        r.status === 'PRESENT' && 'bg-green-100 text-green-700',
                        r.status === 'ABSENT' && 'bg-red-100 text-red-700',
                        r.status === 'LATE' && 'bg-amber-100 text-amber-700',
                        r.status === 'HALF_DAY' && 'bg-purple-100 text-purple-700',
                        !['PRESENT','ABSENT','LATE','HALF_DAY'].includes(r.status) && 'bg-gray-100 text-gray-600',
                      )}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                  {attRecords.length > 20 && (
                    <p className="text-xs text-center text-gray-400 pt-1">
                      + {attRecords.length - 20} more records. Download to view all.
                    </p>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── LEAVE TAB ── */}
        {activeTab === 'Leave' && (
          <>
            <Card>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filters</p>
              <Select
                label="Year"
                value={leaveYear}
                onChange={e => setLeaveYear(e.target.value)}
                options={YEARS}
              />
            </Card>

            {leaveLoading ? (
              <SkeletonCard />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Approved" value={leaveApproved} color="bg-green-50 text-green-700" />
                <StatCard label="Pending" value={leavePending} color="bg-amber-50 text-amber-700" />
                <StatCard label="Rejected" value={leaveRejected} color="bg-red-50 text-red-700" />
              </div>
            )}

            <Card>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Export Report</p>
              <Button
                variant="secondary"
                className="w-full"
                loading={downloading === 'leave-excel'}
                onClick={() => handleDownload(
                  () => downloadLeaveExcel({ year: leaveYear }),
                  `leave-report-${leaveYear}.xlsx`,
                  'leave-excel'
                )}
              >
                <FileSpreadsheet size={16} />
                Download Excel
              </Button>
            </Card>

            {!leaveLoading && leaveRequests.length === 0 && (
              <EmptyState
                icon="🌴"
                title="No leave records"
                subtitle={`No leave data found for ${leaveYear}`}
              />
            )}

            {!leaveLoading && leaveRequests.length > 0 && (
              <Card>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Preview ({leaveRequests.length} requests)
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {leaveRequests.slice(0, 20).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {r.user?.firstName} {r.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{r.leaveType?.name} · {r.totalDays}d</p>
                      </div>
                      <span className={clsx(
                        'text-xs font-bold px-2 py-0.5 rounded-full',
                        r.status === 'APPROVED' && 'bg-green-100 text-green-700',
                        r.status === 'PENDING' && 'bg-amber-100 text-amber-700',
                        r.status === 'REJECTED' && 'bg-red-100 text-red-700',
                        r.status === 'CANCELLED' && 'bg-gray-100 text-gray-600',
                      )}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                  {leaveRequests.length > 20 && (
                    <p className="text-xs text-center text-gray-400 pt-1">
                      + {leaveRequests.length - 20} more. Download to view all.
                    </p>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── PAYROLL TAB ── */}
        {activeTab === 'Payroll' && (
          <>
            <Card>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filters</p>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  options={MONTHS}
                />
                <Select
                  label="Year"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  options={YEARS}
                />
              </div>
            </Card>

            {payrollLoading ? (
              <SkeletonCard />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Employees" value={payrollRecords.length} color="bg-indigo-50 text-indigo-700" />
                <StatCard label="Gross" value={`₹${(totalGross / 100000).toFixed(1)}L`} color="bg-blue-50 text-blue-700" />
                <StatCard label="Net" value={`₹${(totalNet / 100000).toFixed(1)}L`} color="bg-green-50 text-green-700" />
              </div>
            )}

            <Card>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Export Report</p>
              <Button
                variant="secondary"
                className="w-full"
                loading={downloading === 'payroll-excel'}
                onClick={() => handleDownload(
                  () => downloadPayrollExcel({ month, year }),
                  `payroll-${month}-${year}.xlsx`,
                  'payroll-excel'
                )}
              >
                <FileSpreadsheet size={16} />
                Download Excel
              </Button>
            </Card>

            {!payrollLoading && payrollRecords.length === 0 && (
              <EmptyState
                icon="💰"
                title="No payroll records"
                subtitle={`No payroll data found for ${MONTHS.find(m => m.value === month)?.label} ${year}`}
              />
            )}

            {!payrollLoading && payrollRecords.length > 0 && (
              <Card>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Preview ({payrollRecords.length} records)
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {payrollRecords.slice(0, 20).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {r.user?.firstName} {r.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{r.user?.department || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800">
                          ₹{Math.round(r.netSalary).toLocaleString('en-IN')}
                        </p>
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded-full',
                          r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {payrollRecords.length > 20 && (
                    <p className="text-xs text-center text-gray-400 pt-1">
                      + {payrollRecords.length - 20} more. Download to view all.
                    </p>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default ReportsPage;
