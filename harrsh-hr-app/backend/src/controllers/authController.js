const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, department, designation, phone, joinDate } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return error(res, 'Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const employeeId = `EMP${Date.now().toString().slice(-6)}`;

    const user = await prisma.user.create({
      data: {
        employeeId,
        email,
        passwordHash,
        firstName,
        lastName,
        role: role || 'EMPLOYEE',
        department,
        designation,
        phone,
        joinDate: joinDate ? new Date(joinDate) : new Date(),
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        designation: true,
        status: true,
        createdAt: true,
      },
    });

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenValue = generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return success(res, { user, accessToken, refreshToken: refreshTokenValue }, 'User registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        employeeId: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        designation: true,
        status: true,
        profilePhoto: true,
        managerId: true,
      },
    });

    if (!user) {
      return error(res, 'Invalid email or password', 401);
    }

    if (user.status === 'INACTIVE') {
      return error(res, 'Your account has been deactivated. Contact HR.', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return error(res, 'Invalid email or password', 401);
    }

    const { passwordHash, ...userWithoutPassword } = user;

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenValue = generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return success(res, { user: userWithoutPassword, accessToken, refreshToken: refreshTokenValue }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return error(res, 'Refresh token required', 400);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return error(res, 'Invalid or expired refresh token', 401);
    }

    const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
    if (!storedToken) {
      return error(res, 'Refresh token not found', 401);
    }

    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { token } });
      return error(res, 'Refresh token expired', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status === 'INACTIVE') {
      return error(res, 'User not found or inactive', 401);
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(tokenPayload);

    return success(res, { accessToken: newAccessToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }

    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        designation: true,
        managerId: true,
        phone: true,
        joinDate: true,
        status: true,
        profilePhoto: true,
        createdAt: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, designation: true },
        },
      },
    });

    if (!user) {
      return error(res, 'User not found', 404);
    }

    return success(res, user, 'User profile fetched');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return error(res, 'User not found', 404);
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      return error(res, 'Current password is incorrect', 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, logout, me, changePassword };
