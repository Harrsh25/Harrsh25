import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Download, TrendingUp, TrendingDown, Mail } from 'lucide-react';
import { getMyPayslips, downloadPayslip, emailPayslip } from '../api/payroll.js';
import useToast from '../hooks/useToast.js';
import Header from '../components/layout/Header.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Select from '../components/ui/Select.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../components/ui/Skeleton.jsx';
import { formatCurrency, formatMonthYear, formatDate } from '../utils/formatters.js';

const monthOptions = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const yearOptions = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const PayrollPage = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const handleDownload = async (payslip) => {
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
  const selectedPayslip = payslips.find(p => p.month === parseInt(selectedMonth) && p.year === parseInt(selectedYear));
  const latestPayslip = payslips[0];
  const displayPayslip = selectedPayslip || latestPayslip;

  const EarningRow = ({ label, amount }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-800">{formatCurrency(amount)}</span>
    </div>
  );

  return (
    <div>
      <Header title="Payroll" />
      <div className="p-4 space-y-4">
        {/* Month/Year selector */}
        <div className="flex gap-2">
          <Select
            options={monthOptions}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            containerClassName="flex-1"
          />
          <Select
            options={yearOptions}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            containerClassName="w-28"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : !displayPayslip ? (
          <EmptyState icon={DollarSign} title="No payslip found" subtitle={`No payslip available for ${formatMonthYear(parseInt(selectedMonth), parseInt(selectedYear))}`} />
        ) : (
          <>
            {/* Net Pay Hero */}
            <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-indigo-200 text-sm">{formatMonthYear(displayPayslip.month, displayPayslip.year)}</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(displayPayslip.netSalary)}</p>
                  <p className="text-indigo-200 text-xs mt-1">Net Salary</p>
                </div>
                <Badge status={displayPayslip.status} />
              </div>
              {displayPayslip.paidAt && (
                <p className="text-indigo-200 text-xs mt-3">Paid on {formatDate(displayPayslip.paidAt)}</p>
              )}
            </Card>

            {/* Earnings */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-green-600" />
                <h3 className="text-sm font-semibold text-gray-700">Earnings</h3>
                <span className="ml-auto text-sm font-bold text-green-600">{formatCurrency(displayPayslip.grossSalary)}</span>
              </div>
              <EarningRow label="Basic Salary" amount={displayPayslip.basicSalary} />
              <EarningRow label="HRA" amount={displayPayslip.hra} />
              <EarningRow label="Special Allowance" amount={displayPayslip.specialAllowance} />
              <EarningRow label="Transport Allowance" amount={displayPayslip.transportAllowance} />
              <EarningRow label="Medical Allowance" amount={displayPayslip.medicalAllowance} />
            </Card>

            {/* Deductions */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-red-500" />
                <h3 className="text-sm font-semibold text-gray-700">Deductions</h3>
                <span className="ml-auto text-sm font-bold text-red-500">{formatCurrency(displayPayslip.totalDeductions)}</span>
              </div>
              <EarningRow label="PF (Employee)" amount={displayPayslip.pfEmployee} />
              <EarningRow label="Professional Tax" amount={displayPayslip.professionalTax} />
              <EarningRow label="TDS" amount={displayPayslip.tds} />
              {displayPayslip.esiEmployee > 0 && <EarningRow label="ESI" amount={displayPayslip.esiEmployee} />}
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                onClick={() => handleDownload(displayPayslip)}
                disabled={downloading}
              >
                <Download size={16} />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </>
        )}

        {/* History */}
        {payslips.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Payslip History</h3>
            <div className="space-y-2">
              {payslips.map((p) => (
                <Card key={p.id} className="flex items-center justify-between py-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedMonth(String(p.month)); setSelectedYear(String(p.year)); }}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{formatMonthYear(p.month, p.year)}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.paidAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(p.netSalary)}</span>
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
