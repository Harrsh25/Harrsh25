import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  leaveApplicationSchema,
  projectSchema,
  changePasswordSchema,
  registerSchema,
} from '../../utils/validators';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' });
    expect(result.success).toBe(true);
  });
  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(result.success).toBe(false);
  });
  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password is required');
    }
  });
  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('leaveApplicationSchema', () => {
  const validData = {
    leaveTypeId: 'annual',
    startDate: '2024-06-01',
    endDate: '2024-06-05',
    reason: 'Going on vacation for a week',
  };

  it('accepts valid leave application', () => {
    const result = leaveApplicationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
  it('rejects reason shorter than 10 characters', () => {
    const result = leaveApplicationSchema.safeParse({ ...validData, reason: 'Short' });
    expect(result.success).toBe(false);
  });
  it('rejects missing leaveTypeId', () => {
    const result = leaveApplicationSchema.safeParse({ ...validData, leaveTypeId: '' });
    expect(result.success).toBe(false);
  });
  it('rejects end date before start date', () => {
    const result = leaveApplicationSchema.safeParse({
      ...validData,
      startDate: '2024-06-10',
      endDate: '2024-06-05',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('End date must be after start date');
    }
  });
  it('accepts same start and end date', () => {
    const result = leaveApplicationSchema.safeParse({
      ...validData,
      startDate: '2024-06-01',
      endDate: '2024-06-01',
    });
    expect(result.success).toBe(true);
  });
});

describe('projectSchema', () => {
  it('accepts valid project with just a name', () => {
    const result = projectSchema.safeParse({ name: 'My Project' });
    expect(result.success).toBe(true);
  });
  it('rejects project name shorter than 2 characters', () => {
    const result = projectSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });
  it('accepts valid status values', () => {
    for (const status of ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']) {
      const result = projectSchema.safeParse({ name: 'Test', status });
      expect(result.success).toBe(true);
    }
  });
  it('rejects invalid status', () => {
    const result = projectSchema.safeParse({ name: 'Test', status: 'INVALID' });
    expect(result.success).toBe(false);
  });
  it('accepts valid priority values', () => {
    for (const priority of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
      const result = projectSchema.safeParse({ name: 'Test', priority });
      expect(result.success).toBe(true);
    }
  });
});

describe('changePasswordSchema', () => {
  const validData = {
    oldPassword: 'oldpass123',
    newPassword: 'newpass123',
    confirmPassword: 'newpass123',
  };

  it('accepts valid password change', () => {
    const result = changePasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
  it('rejects new password shorter than 6 characters', () => {
    const result = changePasswordSchema.safeParse({ ...validData, newPassword: 'abc', confirmPassword: 'abc' });
    expect(result.success).toBe(false);
  });
  it('rejects mismatched passwords', () => {
    const result = changePasswordSchema.safeParse({
      ...validData,
      newPassword: 'newpass123',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Passwords do not match');
    }
  });
  it('rejects empty old password', () => {
    const result = changePasswordSchema.safeParse({ ...validData, oldPassword: '' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'secret123',
  };

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
  it('rejects empty first name', () => {
    const result = registerSchema.safeParse({ ...validData, firstName: '' });
    expect(result.success).toBe(false);
  });
  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...validData, email: 'bademail' });
    expect(result.success).toBe(false);
  });
  it('rejects password shorter than 6 characters', () => {
    const result = registerSchema.safeParse({ ...validData, password: 'abc' });
    expect(result.success).toBe(false);
  });
  it('accepts valid role values', () => {
    for (const role of ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']) {
      const result = registerSchema.safeParse({ ...validData, role });
      expect(result.success).toBe(true);
    }
  });
  it('rejects invalid role', () => {
    const result = registerSchema.safeParse({ ...validData, role: 'SUPERUSER' });
    expect(result.success).toBe(false);
  });
});
