export const APP_ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  HR: 'HR',
  ADMIN: 'ADMIN',
};

export const LEAVE_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

export const ATTENDANCE_STATUSES = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  HALF_DAY: 'HALF_DAY',
  ON_LEAVE: 'ON_LEAVE',
  HOLIDAY: 'HOLIDAY',
};

export const PROJECT_STATUSES = {
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const TASK_STATUSES = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD',
};

export const PAYROLL_STATUSES = {
  DRAFT: 'DRAFT',
  PROCESSED: 'PROCESSED',
  PAID: 'PAID',
};

export const PRIORITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const STATUS_COLORS = {
  // Leave
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
  // Attendance
  PRESENT: 'green',
  ABSENT: 'red',
  LATE: 'yellow',
  HALF_DAY: 'orange',
  ON_LEAVE: 'blue',
  HOLIDAY: 'purple',
  // Project
  ACTIVE: 'blue',
  ON_HOLD: 'yellow',
  COMPLETED: 'green',
  // Task
  NOT_STARTED: 'gray',
  IN_PROGRESS: 'blue',
  // Payroll
  DRAFT: 'gray',
  PROCESSED: 'blue',
  PAID: 'green',
};
