import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../api/axios.js';
import useToast from '../hooks/useToast.js';

const STEPS = [
  { label: 'Company Info', icon: '🏢' },
  { label: 'Work Schedule', icon: '🕐' },
  { label: 'Leave Policy', icon: '📅' },
  { label: 'Attendance', icon: '📍' },
  { label: 'Review', icon: '✅' },
];

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', slug: '', email: '', phone: '', address: '', website: '',
    timezone: 'Asia/Kolkata', currency: 'INR',
    workStartTime: '09:00', workEndTime: '18:00', workingDays: '1,2,3,4,5',
    leaveApprovalLevels: 1, allowLeaveBackdate: 0, payrollDay: 25,
    requireCheckInGPS: false, gpsRadius: 200, officeLatitude: '', officeLongitude: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data: orgData } = await api.post('/org/onboard', {
        name: form.name, slug: form.slug, email: form.email, phone: form.phone,
        address: form.address, website: form.website, timezone: form.timezone, currency: form.currency,
        workStartTime: form.workStartTime, workEndTime: form.workEndTime, workingDays: form.workingDays,
      });
      await api.put('/org/settings', {
        leaveApprovalLevels: form.leaveApprovalLevels,
        allowLeaveBackdate: form.allowLeaveBackdate,
        payrollDay: form.payrollDay,
        requireCheckInGPS: form.requireCheckInGPS,
        gpsRadius: form.gpsRadius,
        officeLatitude: form.officeLatitude ? parseFloat(form.officeLatitude) : null,
        officeLongitude: form.officeLongitude ? parseFloat(form.officeLongitude) : null,
      });
      return orgData;
    },
    onSuccess: () => {
      showToast('Organization set up successfully!', 'success');
      navigate('/dashboard');
    },
    onError: (err) => showToast(err.response?.data?.message || 'Setup failed', 'error'),
  });

  const steps = [
    <div className="space-y-4">
      <div><label className={labelCls}>Company Name *</label><input className={inputCls} value={form.name} onChange={e => { set('name', e.target.value); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="Acme Corp" /></div>
      <div><label className={labelCls}>URL Slug *</label><input className={inputCls} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="acme-corp" /></div>
      <div><label className={labelCls}>Company Email</label><input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
      <div><label className={labelCls}>Phone</label><input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
      <div><label className={labelCls}>Address</label><textarea className={inputCls} rows={2} value={form.address} onChange={e => set('address', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Timezone</label>
          <select className={inputCls} value={form.timezone} onChange={e => set('timezone', e.target.value)}>
            <option>Asia/Kolkata</option><option>UTC</option><option>America/New_York</option><option>Europe/London</option>
          </select>
        </div>
        <div><label className={labelCls}>Currency</label>
          <select className={inputCls} value={form.currency} onChange={e => set('currency', e.target.value)}>
            <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
          </select>
        </div>
      </div>
    </div>,

    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Work Start Time</label><input type="time" className={inputCls} value={form.workStartTime} onChange={e => set('workStartTime', e.target.value)} /></div>
        <div><label className={labelCls}>Work End Time</label><input type="time" className={inputCls} value={form.workEndTime} onChange={e => set('workEndTime', e.target.value)} /></div>
      </div>
      <div>
        <label className={labelCls}>Working Days</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => {
            const num = String(i + 1);
            const selected = form.workingDays.split(',').includes(num);
            return (
              <button key={d} type="button" onClick={() => {
                const days = form.workingDays ? form.workingDays.split(',').filter(Boolean) : [];
                const updated = selected ? days.filter(x => x !== num) : [...days, num];
                set('workingDays', updated.sort().join(','));
              }} className={`px-3 py-1 rounded-full text-sm border ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600'}`}>{d}</button>
            );
          })}
        </div>
      </div>
      <div><label className={labelCls}>Payroll Day of Month</label><input type="number" min="1" max="31" className={inputCls} value={form.payrollDay} onChange={e => set('payrollDay', parseInt(e.target.value))} /></div>
    </div>,

    <div className="space-y-4">
      <div><label className={labelCls}>Leave Approval Levels</label>
        <select className={inputCls} value={form.leaveApprovalLevels} onChange={e => set('leaveApprovalLevels', parseInt(e.target.value))}>
          <option value={1}>1 — Manager only</option>
          <option value={2}>2 — Manager + HR</option>
        </select>
      </div>
      <div><label className={labelCls}>Allow Backdated Leaves (days)</label><input type="number" min="0" max="30" className={inputCls} value={form.allowLeaveBackdate} onChange={e => set('allowLeaveBackdate', parseInt(e.target.value))} /></div>
    </div>,

    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-medium text-gray-700">Require GPS for Check-in</p><p className="text-xs text-gray-500">Employees must be near office to check in</p></div>
        <button type="button" onClick={() => set('requireCheckInGPS', !form.requireCheckInGPS)} className={`relative w-12 h-6 rounded-full transition-colors ${form.requireCheckInGPS ? 'bg-indigo-600' : 'bg-gray-300'}`}>
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.requireCheckInGPS ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>
      {form.requireCheckInGPS && (
        <>
          <div><label className={labelCls}>Allowed Radius (meters)</label><input type="number" className={inputCls} value={form.gpsRadius} onChange={e => set('gpsRadius', parseInt(e.target.value))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Office Latitude</label><input className={inputCls} placeholder="e.g. 28.6139" value={form.officeLatitude} onChange={e => set('officeLatitude', e.target.value)} /></div>
            <div><label className={labelCls}>Office Longitude</label><input className={inputCls} placeholder="e.g. 77.2090" value={form.officeLongitude} onChange={e => set('officeLongitude', e.target.value)} /></div>
          </div>
          <button type="button" className="text-sm text-indigo-600 underline" onClick={() => {
            navigator.geolocation?.getCurrentPosition(pos => {
              set('officeLatitude', String(pos.coords.latitude.toFixed(6)));
              set('officeLongitude', String(pos.coords.longitude.toFixed(6)));
            });
          }}>Use my current location as office</button>
        </>
      )}
    </div>,

    <div className="space-y-3 text-sm">
      {[
        ['Company', form.name],
        ['Slug', form.slug],
        ['Email', form.email],
        ['Work Hours', `${form.workStartTime} – ${form.workEndTime}`],
        ['Leave Approval', `${form.leaveApprovalLevels} level(s)`],
        ['GPS Check-in', form.requireCheckInGPS ? `Yes (${form.gpsRadius}m)` : 'No'],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between py-2 border-b border-gray-100">
          <span className="text-gray-500">{k}</span>
          <span className="font-medium text-gray-800">{v || '—'}</span>
        </div>
      ))}
    </div>,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Set up your organization</h1>
          <p className="text-sm text-gray-500 mt-1">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
          <div className="flex gap-1 mt-3">
            {STEPS.map((s, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="p-6">
          {steps[step]}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!form.name || !form.slug} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Next</button>
          ) : (
            <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {submitMutation.isPending ? 'Setting up...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
