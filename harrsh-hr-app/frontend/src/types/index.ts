export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY';
export type DocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type PayrollStatus = 'DRAFT' | 'PROCESSED' | 'PAID' | 'CANCELLED';

export interface User {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  designation?: string;
  phone?: string;
  profilePhoto?: string;
  organizationId?: string;
  status: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  daysAllowed: number;
  color?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  user?: User;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  workingHours?: number;
  status: AttendanceStatus;
  latitude?: number;
  longitude?: number;
  user?: User;
}

export interface PayrollRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  grossSalary: number;
  pfEmployee: number;
  professionalTax: number;
  tds: number;
  esiEmployee: number;
  totalDeductions: number;
  netSalary: number;
  status: PayrollStatus;
  paidAt?: string;
  user?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  type: string;
  fileUrl: string;
  status: DocumentStatus;
  uploadedAt: string;
  expiryDate?: string;
  isDeleted: boolean;
}

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

// Toast type
export type ToastType = 'success' | 'error' | 'warning' | 'info';
