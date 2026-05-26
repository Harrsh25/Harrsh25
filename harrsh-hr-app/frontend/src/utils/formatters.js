import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date, fmt = 'dd MMM yyyy') => {
  if (!date) return '—';
  try { return format(typeof date === 'string' ? parseISO(date) : date, fmt); }
  catch { return '—'; }
};

export const formatTime = (date) => {
  if (!date) return '—';
  try { return format(typeof date === 'string' ? parseISO(date) : date, 'hh:mm a'); }
  catch { return '—'; }
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export const formatDuration = (hours) => {
  if (!hours && hours !== 0) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

export const getInitials = (firstName, lastName) => {
  const f = (firstName || '').charAt(0).toUpperCase();
  const l = (lastName || '').charAt(0).toUpperCase();
  return f + l || '??';
};

export const formatRelativeTime = (date) => {
  if (!date) return '—';
  try { return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true }); }
  catch { return '—'; }
};

export const formatMonthYear = (month, year) => {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy');
};

export const getMonthName = (month) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[(month - 1) % 12] || '';
};
