import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const leaveApplicationSchema = z
  .object({
    leaveTypeId: z.string().min(1, 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const projectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']).optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
});

export const onboardingSchema = z.object({
  // Company Info (Step 1)
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  email: z.string().email('Enter a valid company email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
  // Work Schedule (Step 2)
  workStartTime: z.string().min(1, 'Work start time is required'),
  workEndTime: z.string().min(1, 'Work end time is required'),
  workingDays: z.string().min(1, 'Select at least one working day'),
  payrollDay: z.number().int().min(1).max(31),
  // Leave Policy (Step 3)
  leaveApprovalLevels: z.number().int().min(1).max(2),
  allowLeaveBackdate: z.number().int().min(0).max(30),
  // Attendance (Step 4)
  requireCheckInGPS: z.boolean(),
  gpsRadius: z.number().int().min(50).max(5000).optional(),
  officeLatitude: z.string().optional(),
  officeLongitude: z.string().optional(),
});
