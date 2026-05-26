import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDuration,
  formatMonthYear,
  getInitials,
  formatRelativeTime,
  getMonthName,
} from '../../utils/formatters';

describe('formatCurrency', () => {
  it('formats a number as INR currency', () => {
    expect(formatCurrency(50000)).toMatch(/50,000/);
  });
  it('includes rupee symbol', () => {
    expect(formatCurrency(1000)).toMatch(/₹/);
  });
  it('handles zero', () => {
    expect(formatCurrency(0)).toMatch(/0/);
  });
  it('handles negative values', () => {
    expect(formatCurrency(-1000)).toBeDefined();
  });
  it('returns ₹0 for null', () => {
    expect(formatCurrency(null as any)).toBe('₹0');
  });
  it('returns ₹0 for undefined', () => {
    expect(formatCurrency(undefined as any)).toBe('₹0');
  });
});

describe('formatDate', () => {
  it('formats ISO date string as dd MMM yyyy', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBe('15 Jan 2024');
  });
  it('formats a Date object', () => {
    const result = formatDate(new Date(2024, 0, 15));
    expect(result).toBe('15 Jan 2024');
  });
  it('returns em dash for null', () => {
    expect(formatDate(null as any)).toBe('—');
  });
  it('returns em dash for undefined', () => {
    expect(formatDate(undefined as any)).toBe('—');
  });
  it('returns em dash for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
  it('accepts a custom format', () => {
    const result = formatDate('2024-06-01', 'yyyy/MM/dd');
    expect(result).toBe('2024/06/01');
  });
});

describe('formatTime', () => {
  it('formats a time from ISO string', () => {
    const result = formatTime('2024-01-15T09:30:00');
    expect(result).toMatch(/09:30 AM/i);
  });
  it('returns em dash for null', () => {
    expect(formatTime(null as any)).toBe('—');
  });
  it('returns em dash for undefined', () => {
    expect(formatTime(undefined as any)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('formats whole hours', () => {
    expect(formatDuration(8)).toBe('8h 0m');
  });
  it('formats hours and minutes', () => {
    expect(formatDuration(8.5)).toBe('8h 30m');
  });
  it('handles zero hours', () => {
    expect(formatDuration(0)).toBe('0h 0m');
  });
  it('returns em dash for null', () => {
    expect(formatDuration(null as any)).toBe('—');
  });
  it('returns em dash for undefined', () => {
    expect(formatDuration(undefined as any)).toBe('—');
  });
});

describe('formatMonthYear', () => {
  it('returns the correct month and year string', () => {
    expect(formatMonthYear(1, 2024)).toBe('January 2024');
  });
  it('handles December', () => {
    expect(formatMonthYear(12, 2023)).toBe('December 2023');
  });
  it('handles June', () => {
    expect(formatMonthYear(6, 2025)).toBe('June 2025');
  });
});

describe('getInitials', () => {
  it('returns uppercase initials of first and last name', () => {
    expect(getInitials('John', 'Doe')).toBe('JD');
  });
  it('handles single character names', () => {
    expect(getInitials('A', 'B')).toBe('AB');
  });
  it('handles empty strings gracefully', () => {
    const result = getInitials('', '');
    expect(result).toBeDefined();
  });
});

describe('formatRelativeTime', () => {
  it('returns a string for a valid date', () => {
    const result = formatRelativeTime('2024-01-01T00:00:00');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('—');
  });
  it('returns em dash for null', () => {
    expect(formatRelativeTime(null as any)).toBe('—');
  });
  it('returns em dash for undefined', () => {
    expect(formatRelativeTime(undefined as any)).toBe('—');
  });
});

describe('getMonthName', () => {
  it('returns January for month 1', () => {
    expect(getMonthName(1)).toBe('January');
  });
  it('returns December for month 12', () => {
    expect(getMonthName(12)).toBe('December');
  });
  it('returns June for month 6', () => {
    expect(getMonthName(6)).toBe('June');
  });
});
