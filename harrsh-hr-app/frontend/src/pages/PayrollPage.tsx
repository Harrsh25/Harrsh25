import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { getMyPayslips, downloadPayslip } from '../api/payroll';
import useToast from '../hooks/useToast';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { formatMonthYear, formatDate } from '../utils/formatters';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const yearOptions = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

/** Format number as Indian Rupee string, e.g. ₹1,23,456 */
const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const EarningRow = ({ label, amount }: { label: string; amount: number }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-medium text-gray-800">{inr(amount)}</span>
  </div>
);

const PayrollPage = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const handleDownload = async (payslip: any) => {
    setDownloading(true);
    try {
      await downloadPayslip(payslip.id, payslip.month, payslip.year);
      toast.success('Payslip downloaded!');
    } catch (err) {
      toast.error('Failed to download payslip');
    } finally {
      setDownloading(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', 'me'],
    queryFn: () => getMyPayslips({ limit: 24 }),
  });

  const payslips = data?.data?.payslips || [];
  const selectedPayslip = payslips.find(
    (p: any) => p.month === selectedMonth && p.year === selectedYear
  );
  const latestPayslip = payslips[0];
  const displayPayslip = selectedPayslip || latestPayslip;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Payroll" />

      {/* Month chip selector — horizontal scroll row at top */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-3">
        {/* Year selector */}
        <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
          {yearOptions.map((y) => (
            <button
              key={y.value}
              onClick={() => setSelectedYear(parseInt(y.value))}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedYear === parseInt(y.value)
                  ? 'bg-[#1a56db] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {y.label}
            </button>
          ))}
        </div>
        {/* Month chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {MONTHS.map((m, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMonth(idx + 1)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedMonth === idx + 1
                  ? 'bg-[#1a56db] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !displayPayslip ? (
          <EmptyState
            icon={<DollarSign size={32} />}
            title="No payslip found"
            subtitle={`No payslip available for ${formatMonthYear(selectedMonth, selectedYear)}`}
          />
        ) : (
          <>
            {/* Net Pay Hero */}
            <div className="text-center py-6 bg-gradient-to-b from-[#1a56db] to-[#1e40af] text-white rounded-2xl mb-4">
              <p className="text-sm text-blue-200 mb-1">Net Pay</p>
              <p className="text-[32px] font-bold tabular-nums">
                {inr(displayPayslip.netSalary)}
              </p>
              <p className="text-blue-200 text-xs mt-1">
                {MONTHS[displayPayslip.month - 1]} {displayPayslip.year}
              </p>
              {displayPayslip.status === 'PAID' && (
                <span className="mt-2 inline-block bg-green-400/20 text-green-100 text-xs font-semibold px-3 py-1 rounded-full">
                  ✓ Paid
                </span>
              )}
              {displayPayslip.paidAt && (
                <p className="text-blue-200 text-xs mt-1">Paid on {formatDate(displayPayslip.paidAt)}</p>
              )}
            </div>

            {/* Earnings section */}
            <div className="bg-green-50 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-green-600" />
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Earnings</p>
                </div>
                <span className="text-sm font-bold text-green-700">{inr(displayPayslip.grossSalary)}</span>
              </div>
              <EarningRow label="Basic Salary" amount={displayPayslip.basicSalary} />
              <EarningRow label="HRA" amount={displayPayslip.hra} />
              <EarningRow label="Special Allowance" amount={displayPayslip.specialAllowance} />
              <EarningRow label="Transport Allowance" amount={displayPayslip.transportAllowance} />
              <EarningRow label="Medical Allowance" amount={displayPayslip.medicalAllowance} />
            </div>

            {/* Deductions section */}
            <div className="bg-red-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingDown size={15} className="text-red-600" />
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Deductions</p>
                </div>
                <span className="text-sm font-bold text-red-600">{inr(displayPayslip.totalDeductions)}</span>
              </div>
              <EarningRow label="PF (Employee)" amount={displayPayslip.pfEmployee} />
              <EarningRow label="Professional Tax" amount={displayPayslip.professionalTax} />
              <EarningRow label="TDS" amount={displayPayslip.tds} />
              {displayPayslip.esiEmployee > 0 && (
                <EarningRow label="ESI" amount={displayPayslip.esiEmployee} />
              )}
            </div>

            {/* Download */}
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-medium text-gray-500 hover:border-[#1a56db] hover:text-[#1a56db] transition-colors disabled:opacity-50"
                onClick={() => handleDownload(displayPayslip)}
                disabled={downloading}
              >
                <Download size={16} />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </>
        )}

        {/* Payslip History */}
        {payslips.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Payslip History</h3>
            <div className="space-y-2">
              {payslips.map((p: any) => (
                <Card
                  key={p.id}
                  className="flex items-center justify-between py-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedMonth(p.month);
                    setSelectedYear(p.year);
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {formatMonthYear(p.month, p.year)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(p.paidAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {inr(p.netSalary)}
                    </span>
                    <Badge status={p.status} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
