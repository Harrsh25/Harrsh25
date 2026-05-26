import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios.js';
import useToast from '../hooks/useToast.js';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const OrgSettingsPage = () => {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'national' });

  const { data: orgData } = useQuery({
    queryKey: ['org'],
    queryFn: () => api.get('/org').then(r => r.data.data),
  });

  const { data: settingsData } = useQuery({
    queryKey: ['org-settings'],
    queryFn: () => api.get('/org/settings').then(r => r.data.data),
  });

  const { data: holidaysData } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => api.get('/org/holidays').then(r => r.data.data),
  });

  const [orgForm, setOrgForm] = useState({});
  const [settingsForm, setSettingsForm] = useState({});

  const org = { ...orgData, ...orgForm };
  const settings = { ...settingsData, ...settingsForm };

  const setOrg = (k, v) => setOrgForm(f => ({ ...f, [k]: v }));
  const setSettings = (k, v) => setSettingsForm(f => ({ ...f, [k]: v }));

  const updateOrgMutation = useMutation({
    mutationFn: () => api.put('/org', orgForm),
    onSuccess: () => { showToast('Organization updated', 'success'); qc.invalidateQueries({ queryKey: ['org'] }); setOrgForm({}); },
    onError: (e) => showToast(e.response?.data?.message || 'Update failed', 'error'),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: () => api.put('/org/settings', settingsForm),
    onSuccess: () => { showToast('Settings saved', 'success'); qc.invalidateQueries({ queryKey: ['org-settings'] }); setSettingsForm({}); },
    onError: (e) => showToast(e.response?.data?.message || 'Save failed', 'error'),
  });

  const addHolidayMutation = useMutation({
    mutationFn: () => api.post('/org/holidays', newHoliday),
    onSuccess: () => { showToast('Holiday added', 'success'); qc.invalidateQueries({ queryKey: ['holidays'] }); setNewHoliday({ name: '', date: '', type: 'national' }); },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id) => api.delete(`/org/holidays/${id}`),
    onSuccess: () => { showToast('Holiday removed', 'success'); qc.invalidateQueries({ queryKey: ['holidays'] }); },
  });

  const tabs = ['general', 'attendance', 'leave', 'notifications', 'holidays'];

  return (
    <div className="p-4 pb-24">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Organization Settings</h1>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize ${activeTab === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div><label className={labelCls}>Company Name</label><input className={inputCls} value={org.name || ''} onChange={e => setOrg('name', e.target.value)} /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} value={org.email || ''} onChange={e => setOrg('email', e.target.value)} /></div>
          <div><label className={labelCls}>Phone</label><input className={inputCls} value={org.phone || ''} onChange={e => setOrg('phone', e.target.value)} /></div>
          <div><label className={labelCls}>Address</label><textarea className={inputCls} rows={2} value={org.address || ''} onChange={e => setOrg('address', e.target.value)} /></div>
          <div><label className={labelCls}>Website</label><input className={inputCls} value={org.website || ''} onChange={e => setOrg('website', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Work Start</label><input type="time" className={inputCls} value={org.workStartTime || '09:00'} onChange={e => setOrg('workStartTime', e.target.value)} /></div>
            <div><label className={labelCls}>Work End</label><input type="time" className={inputCls} value={org.workEndTime || '18:00'} onChange={e => setOrg('workEndTime', e.target.value)} /></div>
          </div>
          {Object.keys(orgForm).length > 0 && (
            <button onClick={() => updateOrgMutation.mutate()} disabled={updateOrgMutation.isPending} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {updateOrgMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-700">Require GPS Check-in</p><p className="text-xs text-gray-500">Employees must be near office</p></div>
            <button type="button" onClick={() => setSettings('requireCheckInGPS', !settings.requireCheckInGPS)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.requireCheckInGPS ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.requireCheckInGPS ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          {settings.requireCheckInGPS && (
            <>
              <div><label className={labelCls}>Allowed Radius (meters)</label><input type="number" className={inputCls} value={settings.gpsRadius || 200} onChange={e => setSettings('gpsRadius', parseInt(e.target.value))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Office Latitude</label><input className={inputCls} value={settings.officeLatitude || ''} onChange={e => setSettings('officeLatitude', parseFloat(e.target.value))} /></div>
                <div><label className={labelCls}>Office Longitude</label><input className={inputCls} value={settings.officeLongitude || ''} onChange={e => setSettings('officeLongitude', parseFloat(e.target.value))} /></div>
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-700">Auto Check-out</p><p className="text-xs text-gray-500">Auto check out at end of day</p></div>
            <button type="button" onClick={() => setSettings('autoCheckOut', !settings.autoCheckOut)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.autoCheckOut ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.autoCheckOut ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          {settings.autoCheckOut && (
            <div><label className={labelCls}>Auto Check-out Time</label><input type="time" className={inputCls} value={settings.autoCheckOutTime || '19:00'} onChange={e => setSettings('autoCheckOutTime', e.target.value)} /></div>
          )}
          {Object.keys(settingsForm).length > 0 && (
            <button onClick={() => updateSettingsMutation.mutate()} disabled={updateSettingsMutation.isPending} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Attendance Settings'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div><label className={labelCls}>Approval Levels</label>
            <select className={inputCls} value={settings.leaveApprovalLevels || 1} onChange={e => setSettings('leaveApprovalLevels', parseInt(e.target.value))}>
              <option value={1}>1 — Manager only</option>
              <option value={2}>2 — Manager + HR</option>
            </select>
          </div>
          <div><label className={labelCls}>Allow Backdated Leave (days)</label><input type="number" min="0" max="30" className={inputCls} value={settings.allowLeaveBackdate || 0} onChange={e => setSettings('allowLeaveBackdate', parseInt(e.target.value))} /></div>
          <div><label className={labelCls}>Payroll Day</label><input type="number" min="1" max="31" className={inputCls} value={settings.payrollDay || 25} onChange={e => setSettings('payrollDay', parseInt(e.target.value))} /></div>
          {Object.keys(settingsForm).length > 0 && (
            <button onClick={() => updateSettingsMutation.mutate()} disabled={updateSettingsMutation.isPending} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Leave Settings'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-700">Email Notifications</p><p className="text-xs text-gray-500">Send emails for leave, payslip, etc.</p></div>
            <button type="button" onClick={() => setSettings('emailNotifications', !settings.emailNotifications)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.emailNotifications ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.emailNotifications ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          {settings.emailNotifications && (
            <>
              <div><label className={labelCls}>SMTP Host</label><input className={inputCls} value={settings.smtpHost || ''} onChange={e => setSettings('smtpHost', e.target.value)} placeholder="smtp.gmail.com" /></div>
              <div><label className={labelCls}>SMTP Port</label><input type="number" className={inputCls} value={settings.smtpPort || 587} onChange={e => setSettings('smtpPort', parseInt(e.target.value))} /></div>
              <div><label className={labelCls}>SMTP User</label><input className={inputCls} value={settings.smtpUser || ''} onChange={e => setSettings('smtpUser', e.target.value)} /></div>
              <div><label className={labelCls}>SMTP Password</label><input type="password" className={inputCls} value={settings.smtpPass || ''} onChange={e => setSettings('smtpPass', e.target.value)} /></div>
            </>
          )}
          {Object.keys(settingsForm).length > 0 && (
            <button onClick={() => updateSettingsMutation.mutate()} disabled={updateSettingsMutation.isPending} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Notification Settings'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'holidays' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Add Holiday</h3>
            <div><label className={labelCls}>Holiday Name</label><input className={inputCls} value={newHoliday.name} onChange={e => setNewHoliday(h => ({...h, name: e.target.value}))} placeholder="Republic Day" /></div>
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={newHoliday.date} onChange={e => setNewHoliday(h => ({...h, date: e.target.value}))} /></div>
            <div><label className={labelCls}>Type</label>
              <select className={inputCls} value={newHoliday.type} onChange={e => setNewHoliday(h => ({...h, type: e.target.value}))}>
                <option value="national">National</option><option value="regional">Regional</option><option value="optional">Optional</option>
              </select>
            </div>
            <button onClick={() => addHolidayMutation.mutate()} disabled={!newHoliday.name || !newHoliday.date || addHolidayMutation.isPending} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              Add Holiday
            </button>
          </div>

          <div className="space-y-2">
            {(holidaysData || []).map(h => (
              <div key={h.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString()} • {h.type}</p>
                </div>
                <button onClick={() => deleteHolidayMutation.mutate(h.id)} className="text-red-400 text-xs underline">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgSettingsPage;
