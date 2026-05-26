const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

// POST /org/onboard — create org + first admin user in one transaction
const onboardOrg = async (req, res) => {
  try {
    const {
      orgName, slug, industry, size,
      adminFirstName, adminLastName, adminEmail, adminPassword,
      timezone, workStartTime, workEndTime, workingDays,
    } = req.body;

    if (!orgName || !adminEmail || !adminPassword) {
      return error(res, 'orgName, adminEmail, and adminPassword are required', 400);
    }

    const slugValue = slug || orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const existing = await prisma.organization.findUnique({ where: { slug: slugValue } });
    if (existing) return error(res, 'Organization slug already taken', 400);

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) return error(res, 'Email already registered', 400);

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: slugValue,
          timezone: timezone || 'Asia/Kolkata',
          workStartTime: workStartTime || '09:00',
          workEndTime: workEndTime || '18:00',
          workingDays: workingDays || '1,2,3,4,5',
        },
      });

      await tx.orgSettings.create({ data: { organizationId: org.id } });

      const admin = await tx.user.create({
        data: {
          employeeId: 'EMP0001',
          email: adminEmail,
          passwordHash,
          firstName: adminFirstName || 'Admin',
          lastName: adminLastName || 'User',
          role: 'ADMIN',
          department: 'Administration',
          designation: 'System Administrator',
          status: 'ACTIVE',
          organizationId: org.id,
          joinDate: new Date(),
        },
      });

      return { org, admin };
    });

    return success(res, { organization: result.org, adminEmail }, 'Organization onboarded successfully', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to onboard organization', 500);
  }
};

// GET /org — return current user's organization
const getMyOrg = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return error(res, 'No organization associated with this account', 404);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        settings: true,
        _count: { select: { users: true, departments: true, projects: true } },
      },
    });
    if (!org) return error(res, 'Organization not found', 404);

    // Remove SMTP password from settings
    if (org.settings) {
      const { smtpPass, ...safeSettings } = org.settings;
      org.settings = safeSettings;
    }

    return success(res, org);
  } catch (err) {
    return error(res, 'Failed to fetch organization', 500);
  }
};

// PUT /org — admin only, update org details
const updateOrg = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return error(res, 'No organization associated', 404);

    const {
      name, logoUrl, timezone, currency, fiscalYearStart, workingDays,
      workStartTime, workEndTime, address, phone, email: orgEmail,
      website, plan, maxEmployees,
    } = req.body;

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(name && { name }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(timezone && { timezone }),
        ...(currency && { currency }),
        ...(fiscalYearStart !== undefined && { fiscalYearStart: parseInt(fiscalYearStart) }),
        ...(workingDays && { workingDays }),
        ...(workStartTime && { workStartTime }),
        ...(workEndTime && { workEndTime }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(orgEmail !== undefined && { email: orgEmail }),
        ...(website !== undefined && { website }),
        ...(plan && { plan }),
        ...(maxEmployees !== undefined && { maxEmployees: parseInt(maxEmployees) }),
      },
    });
    return success(res, org, 'Organization updated successfully');
  } catch (err) {
    return error(res, 'Failed to update organization', 500);
  }
};

// GET /org/settings
const getOrgSettings = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return error(res, 'No organization associated', 404);

    const settings = await prisma.orgSettings.findUnique({ where: { organizationId: orgId } });
    if (!settings) return error(res, 'Settings not found', 404);

    const { smtpPass, ...safeSettings } = settings;
    return success(res, safeSettings);
  } catch (err) {
    return error(res, 'Failed to fetch settings', 500);
  }
};

// PUT /org/settings — admin only
const updateOrgSettings = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return error(res, 'No organization associated', 404);

    const {
      requireCheckInGPS, gpsRadius, officeLatitude, officeLongitude,
      requireSelfie, autoCheckOut, autoCheckOutTime, leaveApprovalLevels,
      allowLeaveBackdate, payrollDay, emailNotifications,
      smtpHost, smtpPort, smtpUser, smtpPass,
    } = req.body;

    const updateData = {
      ...(requireCheckInGPS !== undefined && { requireCheckInGPS: Boolean(requireCheckInGPS) }),
      ...(gpsRadius !== undefined && { gpsRadius: parseInt(gpsRadius) }),
      ...(officeLatitude !== undefined && { officeLatitude: officeLatitude ? parseFloat(officeLatitude) : null }),
      ...(officeLongitude !== undefined && { officeLongitude: officeLongitude ? parseFloat(officeLongitude) : null }),
      ...(requireSelfie !== undefined && { requireSelfie: Boolean(requireSelfie) }),
      ...(autoCheckOut !== undefined && { autoCheckOut: Boolean(autoCheckOut) }),
      ...(autoCheckOutTime !== undefined && { autoCheckOutTime }),
      ...(leaveApprovalLevels !== undefined && { leaveApprovalLevels: parseInt(leaveApprovalLevels) }),
      ...(allowLeaveBackdate !== undefined && { allowLeaveBackdate: parseInt(allowLeaveBackdate) }),
      ...(payrollDay !== undefined && { payrollDay: parseInt(payrollDay) }),
      ...(emailNotifications !== undefined && { emailNotifications: Boolean(emailNotifications) }),
      ...(smtpHost !== undefined && { smtpHost }),
      ...(smtpPort !== undefined && { smtpPort: smtpPort ? parseInt(smtpPort) : null }),
      ...(smtpUser !== undefined && { smtpUser }),
      ...(smtpPass !== undefined && { smtpPass }),
    };

    const settings = await prisma.orgSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...updateData },
      update: updateData,
    });

    const { smtpPass: _p, ...safeSettings } = settings;
    return success(res, safeSettings, 'Settings updated successfully');
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to update settings', 500);
  }
};

// GET /org/stats
const getOrgStats = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return error(res, 'No organization associated', 404);

    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [totalEmployees, presentToday, onLeaveToday, pendingLeaves, activeProjects] = await Promise.all([
      prisma.user.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
      prisma.attendanceRecord.count({
        where: { organizationId: orgId, date: todayOnly, status: { in: ['PRESENT', 'LATE'] } },
      }),
      prisma.leaveRequest.count({
        where: { organizationId: orgId, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
      }),
      prisma.leaveRequest.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      prisma.project.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
    ]);

    return success(res, { totalEmployees, presentToday, onLeaveToday, pendingLeaves, activeProjects });
  } catch (err) {
    return error(res, 'Failed to fetch org stats', 500);
  }
};

// POST /org/invite — admin/HR sends invite email
const inviteEmployee = async (req, res) => {
  try {
    const { email, firstName, lastName, role, department } = req.body;
    if (!email) return error(res, 'Email is required', 400);

    const orgId = req.user.organizationId;
    if (!orgId) return error(res, 'No organization associated', 400);

    const org = await prisma.organization.findUnique({ where: { id: orgId }, include: { settings: true } });

    // Check employee count limit
    const currentCount = await prisma.user.count({ where: { organizationId: orgId, status: 'ACTIVE' } });
    if (org && currentCount >= org.maxEmployees) {
      return error(res, `Employee limit reached (${org.maxEmployees}). Please upgrade your plan.`, 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return error(res, 'Email already registered', 400);

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Generate employee ID
    const lastEmployee = await prisma.user.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
    const empNum = lastEmployee ? parseInt(lastEmployee.employeeId.replace(/\D/g, '') || '0') + 1 : 1;
    const employeeId = `EMP${String(empNum).padStart(4, '0')}`;

    const newUser = await prisma.user.create({
      data: {
        employeeId,
        email,
        passwordHash,
        firstName: firstName || 'New',
        lastName: lastName || 'Employee',
        role: role || 'EMPLOYEE',
        department: department || null,
        status: 'ACTIVE',
        organizationId: orgId,
        joinDate: new Date(),
      },
    });

    // Try to send invite email (non-blocking)
    try {
      const { sendEmail, welcomeTemplate } = require('../services/emailService');
      const orgName = org?.name || 'Harrsh HR';
      await sendEmail(
        {
          to: email,
          subject: `Welcome to ${orgName} HR Portal`,
          html: welcomeTemplate(`${firstName || ''} ${lastName || ''}`.trim(), orgName, email, tempPassword),
        },
        org?.settings || null
      );
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    return success(
      res,
      { id: newUser.id, email: newUser.email, employeeId: newUser.employeeId, tempPassword },
      'Employee invited successfully',
      201
    );
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to invite employee', 500);
  }
};

// GET /org/holidays
const getOrgHolidays = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return error(res, 'No organization associated', 404);

    const { year } = req.query;
    const where = { organizationId: orgId };
    if (year) {
      const y = parseInt(year);
      where.date = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) };
    }

    const holidays = await prisma.holiday.findMany({ where, orderBy: { date: 'asc' } });
    return success(res, holidays);
  } catch (err) {
    return error(res, 'Failed to fetch holidays', 500);
  }
};

// POST /org/holidays
const addHoliday = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return error(res, 'No organization associated', 404);

    const { name, date, type, isRecurring } = req.body;
    if (!name || !date) return error(res, 'Name and date are required', 400);

    const holiday = await prisma.holiday.create({
      data: {
        organizationId: orgId,
        name,
        date: new Date(date),
        type: type || 'national',
        isRecurring: isRecurring !== false,
      },
    });
    return success(res, holiday, 'Holiday added successfully', 201);
  } catch (err) {
    return error(res, 'Failed to add holiday', 500);
  }
};

// DELETE /org/holidays/:id
const deleteHoliday = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const holiday = await prisma.holiday.findUnique({ where: { id: req.params.id } });
    if (!holiday) return error(res, 'Holiday not found', 404);
    if (holiday.organizationId !== orgId) return error(res, 'Forbidden', 403);

    await prisma.holiday.delete({ where: { id: req.params.id } });
    return success(res, null, 'Holiday deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete holiday', 500);
  }
};

module.exports = {
  onboardOrg,
  getMyOrg,
  updateOrg,
  getOrgSettings,
  updateOrgSettings,
  getOrgStats,
  inviteEmployee,
  getOrgHolidays,
  addHoliday,
  deleteHoliday,
};
