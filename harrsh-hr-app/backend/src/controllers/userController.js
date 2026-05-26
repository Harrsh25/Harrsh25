const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const userSelect = {
  id: true, employeeId: true, email: true, firstName: true, lastName: true,
  role: true, department: true, designation: true, managerId: true,
  phone: true, joinDate: true, status: true, profilePhoto: true,
  createdAt: true, updatedAt: true,
};

const getAllUsers = async (req, res) => {
  try {
    const { department, role, status, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (department) where.department = department;
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: userSelect, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);
    return success(res, { users, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch users', 500);
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: userSelect });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user);
  } catch (err) {
    return error(res, 'Failed to fetch user', 500);
  }
};

const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, role, department, designation, managerId, phone, joinDate, status } = req.body;
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'User not found', 404);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(role && { role }),
        ...(department !== undefined && { department }),
        ...(designation !== undefined && { designation }),
        ...(managerId !== undefined && { managerId }),
        ...(phone !== undefined && { phone }),
        ...(joinDate !== undefined && { joinDate: joinDate ? new Date(joinDate) : null }),
        ...(status && { status }),
      },
      select: userSelect,
    });
    return success(res, user, 'User updated successfully');
  } catch (err) {
    return error(res, 'Failed to update user', 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'User not found', 404);
    await prisma.user.update({ where: { id: req.params.id }, data: { status: 'INACTIVE' } });
    return success(res, null, 'User deactivated successfully');
  } catch (err) {
    return error(res, 'Failed to delete user', 500);
  }
};

const updateProfilePhoto = async (req, res) => {
  try {
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : req.body.profilePhoto;
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { profilePhoto: photoUrl }, select: userSelect });
    return success(res, user, 'Profile photo updated');
  } catch (err) {
    return error(res, 'Failed to update profile photo', 500);
  }
};

const getDirectReports = async (req, res) => {
  try {
    const users = await prisma.user.findMany({ where: { managerId: req.params.id }, select: userSelect });
    return success(res, users);
  } catch (err) {
    return error(res, 'Failed to fetch direct reports', 500);
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser, updateProfilePhoto, getDirectReports };
