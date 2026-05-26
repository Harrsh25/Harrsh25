const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department, designation, phone, joinDate } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return error(res, 'Email already in use', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const count = await prisma.user.count();
    const employeeId = `EMP${String(count + 1).padStart(4, '0')}`;

    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, role: role || 'EMPLOYEE', department, designation, phone, joinDate: joinDate ? new Date(joinDate) : null, employeeId },
      select: { id: true, employeeId: true, email: true, firstName: true, lastName: true, role: true, department: true, designation: true, status: true, createdAt: true },
    });

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

    return success(res, { user, accessToken, refreshToken }, 'Registration successful', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Registration failed', 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return error(res, 'Invalid credentials', 401);
    if (user.status === 'INACTIVE') return error(res, 'Account is inactive', 403);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return error(res, 'Invalid credentials', 401);

    const payload = { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: user.id });
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

    const { passwordHash, ...userWithoutPassword } = user;
    return success(res, { user: userWithoutPassword, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    console.error(err);
    return error(res, 'Login failed', 500);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return error(res, 'Refresh token required', 400);

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (e) {
      return error(res, 'Invalid or expired refresh token', 401);
    }

    const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) await prisma.refreshToken.delete({ where: { token } });
      return error(res, 'Refresh token expired or revoked', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return error(res, 'User not found', 404);

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName });
    return success(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    console.error(err);
    return error(res, 'Token refresh failed', 500);
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    return success(res, null, 'Logged out');
  }
};

const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, employeeId: true, email: true, firstName: true, lastName: true, role: true, department: true, designation: true, phone: true, joinDate: true, status: true, profilePhoto: true, managerId: true, createdAt: true, updatedAt: true },
    });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user);
  } catch (err) {
    return error(res, 'Failed to fetch profile', 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return error(res, 'User not found', 404);

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) return error(res, 'Current password is incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return success(res, null, 'Password changed successfully');
  } catch (err) {
    return error(res, 'Failed to change password', 500);
  }
};

module.exports = { register, login, refreshToken, logout, me, changePassword };
