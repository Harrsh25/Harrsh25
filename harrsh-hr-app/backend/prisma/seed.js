const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.document.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // Create Leave Types
  const leaveTypes = await Promise.all([
    prisma.leaveType.create({ data: { name: 'Casual Leave', description: 'For personal and casual purposes', totalDays: 12, carryForward: false, isPaid: true, color: '#3B82F6' } }),
    prisma.leaveType.create({ data: { name: 'Sick Leave', description: 'For medical and health reasons', totalDays: 10, carryForward: false, isPaid: true, color: '#EF4444' } }),
    prisma.leaveType.create({ data: { name: 'Annual Leave', description: 'Earned annual vacation leave', totalDays: 15, carryForward: true, isPaid: true, color: '#10B981' } }),
    prisma.leaveType.create({ data: { name: 'Maternity Leave', description: 'For expectant mothers', totalDays: 90, carryForward: false, isPaid: true, color: '#F59E0B' } }),
    prisma.leaveType.create({ data: { name: 'Paternity Leave', description: 'For new fathers', totalDays: 15, carryForward: false, isPaid: true, color: '#8B5CF6' } }),
  ]);

  const [casualLeave, sickLeave, annualLeave, maternityLeave, paternityLeave] = leaveTypes;

  // Hash passwords
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const hrHash = await bcrypt.hash('Hr@123', 12);
  const managerHash = await bcrypt.hash('Manager@123', 12);
  const empHash = await bcrypt.hash('Employee@123', 12);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      employeeId: 'EMP0001', email: 'admin@harrsh.com', passwordHash: adminHash,
      firstName: 'System', lastName: 'Admin', role: 'ADMIN',
      department: 'Administration', designation: 'System Administrator',
      phone: '+91-9000000001', joinDate: new Date('2020-01-01'), status: 'ACTIVE',
    },
  });

  // Create HR
  const hr = await prisma.user.create({
    data: {
      employeeId: 'EMP0002', email: 'hr@harrsh.com', passwordHash: hrHash,
      firstName: 'Priya', lastName: 'Sharma', role: 'HR',
      department: 'HR', designation: 'HR Manager',
      phone: '+91-9000000002', joinDate: new Date('2020-03-15'), status: 'ACTIVE',
    },
  });

  // Create Managers
  const manager1 = await prisma.user.create({
    data: {
      employeeId: 'EMP0003', email: 'manager.eng@harrsh.com', passwordHash: managerHash,
      firstName: 'Rahul', lastName: 'Gupta', role: 'MANAGER',
      department: 'Engineering', designation: 'Engineering Manager',
      phone: '+91-9000000003', joinDate: new Date('2020-06-01'), status: 'ACTIVE',
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      employeeId: 'EMP0004', email: 'manager.ops@harrsh.com', passwordHash: managerHash,
      firstName: 'Sunita', lastName: 'Patel', role: 'MANAGER',
      department: 'Operations', designation: 'Operations Manager',
      phone: '+91-9000000004', joinDate: new Date('2021-01-10'), status: 'ACTIVE',
    },
  });

  const manager3 = await prisma.user.create({
    data: {
      employeeId: 'EMP0005', email: 'manager.mkt@harrsh.com', passwordHash: managerHash,
      firstName: 'Vikram', lastName: 'Singh', role: 'MANAGER',
      department: 'Marketing', designation: 'Marketing Manager',
      phone: '+91-9000000005', joinDate: new Date('2021-03-20'), status: 'ACTIVE',
    },
  });

  // Create Employees
  const empData = [
    { employeeId: 'EMP0006', email: 'emp1@harrsh.com', firstName: 'Amit', lastName: 'Kumar', department: 'Engineering', designation: 'Senior Developer', managerId: manager1.id },
    { employeeId: 'EMP0007', email: 'emp2@harrsh.com', firstName: 'Deepa', lastName: 'Nair', department: 'Engineering', designation: 'Frontend Developer', managerId: manager1.id },
    { employeeId: 'EMP0008', email: 'emp3@harrsh.com', firstName: 'Ravi', lastName: 'Joshi', department: 'Engineering', designation: 'Backend Developer', managerId: manager1.id },
    { employeeId: 'EMP0009', email: 'emp4@harrsh.com', firstName: 'Meena', lastName: 'Reddy', department: 'Operations', designation: 'Operations Analyst', managerId: manager2.id },
    { employeeId: 'EMP0010', email: 'emp5@harrsh.com', firstName: 'Arun', lastName: 'Verma', department: 'Operations', designation: 'Process Coordinator', managerId: manager2.id },
    { employeeId: 'EMP0011', email: 'emp6@harrsh.com', firstName: 'Kavya', lastName: 'Menon', department: 'Marketing', designation: 'Marketing Analyst', managerId: manager3.id },
    { employeeId: 'EMP0012', email: 'emp7@harrsh.com', firstName: 'Suresh', lastName: 'Iyer', department: 'Marketing', designation: 'Content Writer', managerId: manager3.id },
    { employeeId: 'EMP0013', email: 'emp8@harrsh.com', firstName: 'Anjali', lastName: 'Desai', department: 'Finance', designation: 'Finance Analyst', managerId: hr.id },
    { employeeId: 'EMP0014', email: 'emp9@harrsh.com', firstName: 'Kiran', lastName: 'Rao', department: 'Engineering', designation: 'QA Engineer', managerId: manager1.id },
    { employeeId: 'EMP0015', email: 'emp10@harrsh.com', firstName: 'Pooja', lastName: 'Bhat', department: 'Operations', designation: 'Business Analyst', managerId: manager2.id },
  ];

  const employees = await Promise.all(
    empData.map(emp => prisma.user.create({
      data: { ...emp, passwordHash: empHash, role: 'EMPLOYEE', phone: `+91-900000${emp.employeeId.slice(-4)}`, joinDate: new Date('2022-01-15'), status: 'ACTIVE' },
    }))
  );

  // Create Departments
  await Promise.all([
    prisma.department.create({ data: { name: 'Engineering', description: 'Software development and engineering', headId: manager1.id } }),
    prisma.department.create({ data: { name: 'HR', description: 'Human Resources department', headId: hr.id } }),
    prisma.department.create({ data: { name: 'Finance', description: 'Finance and accounting', headId: admin.id } }),
    prisma.department.create({ data: { name: 'Operations', description: 'Business operations', headId: manager2.id } }),
    prisma.department.create({ data: { name: 'Marketing', description: 'Marketing and brand management', headId: manager3.id } }),
  ]);

  // Create Leave Balances for all users
  const allUsers = [admin, hr, manager1, manager2, manager3, ...employees];
  const currentYear = new Date().getFullYear();

  for (const user of allUsers) {
    for (const lt of leaveTypes) {
      const used = Math.floor(Math.random() * Math.min(5, lt.totalDays));
      await prisma.leaveBalance.create({
        data: { userId: user.id, leaveTypeId: lt.id, year: currentYear, allocated: lt.totalDays, used, remaining: lt.totalDays - used },
      });
    }
  }

  // Create sample attendance records for last 30 days
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT'];
  for (const user of allUsers) {
    for (let i = 30; i >= 1; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      if (status === 'ABSENT') {
        await prisma.attendanceRecord.create({ data: { userId: user.id, date: dateOnly, status: 'ABSENT' } });
        continue;
      }
      const checkInHour = status === 'LATE' ? 10 : 9;
      const checkInMin = status === 'LATE' ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 30);
      const checkIn = new Date(dateOnly);
      checkIn.setHours(checkInHour, checkInMin, 0, 0);
      const checkOut = new Date(checkIn);
      checkOut.setHours(checkOut.getHours() + 8 + Math.floor(Math.random() * 2));
      const workingHours = (checkOut - checkIn) / (1000 * 60 * 60);

      await prisma.attendanceRecord.create({
        data: { userId: user.id, date: dateOnly, checkInTime: checkIn, checkOutTime: checkOut, status, workingHours: Math.round(workingHours * 100) / 100 },
      });
    }
  }

  // Create sample projects
  const project1 = await prisma.project.create({
    data: {
      name: 'HR Portal Development', description: 'Building the internal HR management system',
      status: 'ACTIVE', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'),
      managerId: manager1.id, budget: 500000, progress: 65, priority: 'HIGH',
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Marketing Campaign Q2', description: 'Q2 digital marketing campaign',
      status: 'ACTIVE', startDate: new Date('2024-04-01'), endDate: new Date('2024-06-30'),
      managerId: manager3.id, budget: 200000, progress: 40, priority: 'MEDIUM',
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Operations Optimization', description: 'Streamlining business operations',
      status: 'ON_HOLD', startDate: new Date('2024-03-01'), endDate: new Date('2024-09-30'),
      managerId: manager2.id, budget: 300000, progress: 20, priority: 'MEDIUM',
    },
  });

  // Create tasks
  await Promise.all([
    prisma.task.create({ data: { projectId: project1.id, title: 'Design Database Schema', description: 'Create comprehensive DB schema', assignedToId: employees[0].id, assignedById: manager1.id, status: 'COMPLETED', priority: 'HIGH', progress: 100, dueDate: new Date('2024-02-28') } }),
    prisma.task.create({ data: { projectId: project1.id, title: 'Build Authentication Module', description: 'JWT auth with refresh tokens', assignedToId: employees[2].id, assignedById: manager1.id, status: 'COMPLETED', priority: 'HIGH', progress: 100, dueDate: new Date('2024-03-15') } }),
    prisma.task.create({ data: { projectId: project1.id, title: 'Frontend Dashboard', description: 'Build responsive dashboard UI', assignedToId: employees[1].id, assignedById: manager1.id, status: 'IN_PROGRESS', priority: 'HIGH', progress: 70, dueDate: new Date('2024-05-30') } }),
    prisma.task.create({ data: { projectId: project1.id, title: 'Leave Management Module', description: 'Complete leave workflow', assignedToId: employees[0].id, assignedById: manager1.id, status: 'IN_PROGRESS', priority: 'MEDIUM', progress: 50, dueDate: new Date('2024-06-15') } }),
    prisma.task.create({ data: { projectId: project1.id, title: 'Testing & QA', description: 'End-to-end testing', assignedToId: employees[8].id, assignedById: manager1.id, status: 'NOT_STARTED', priority: 'HIGH', progress: 0, dueDate: new Date('2024-07-31') } }),
    prisma.task.create({ data: { projectId: project2.id, title: 'Content Strategy', description: 'Create Q2 content plan', assignedToId: employees[6].id, assignedById: manager3.id, status: 'COMPLETED', priority: 'HIGH', progress: 100, dueDate: new Date('2024-04-15') } }),
    prisma.task.create({ data: { projectId: project2.id, title: 'Social Media Campaign', description: 'Run social media ads', assignedToId: employees[5].id, assignedById: manager3.id, status: 'IN_PROGRESS', priority: 'MEDIUM', progress: 60, dueDate: new Date('2024-05-31') } }),
    prisma.task.create({ data: { projectId: project3.id, title: 'Process Analysis', description: 'Analyze current processes', assignedToId: employees[3].id, assignedById: manager2.id, status: 'IN_PROGRESS', priority: 'MEDIUM', progress: 30, dueDate: new Date('2024-05-15') } }),
  ]);

  // Create sample payroll records
  const salaryMap = {
    ADMIN: 100000, HR: 80000, MANAGER: 90000, EMPLOYEE: 60000,
  };
  for (const user of allUsers) {
    const basicSalary = salaryMap[user.role] || 60000;
    const hra = basicSalary * 0.4;
    const specialAllowance = basicSalary * 0.2;
    const transportAllowance = 2000;
    const medicalAllowance = 1250;
    const grossSalary = basicSalary + hra + specialAllowance + transportAllowance + medicalAllowance;
    const pfEmployee = basicSalary * 0.12;
    const pfEmployer = basicSalary * 0.12;
    const professionalTax = 200;
    const tds = grossSalary > 50000 ? grossSalary * 0.1 : 0;
    const esiEmployee = grossSalary <= 21000 ? grossSalary * 0.0075 : 0;
    const totalDeductions = pfEmployee + professionalTax + tds + esiEmployee;
    const netSalary = grossSalary - totalDeductions;

    for (let month = 1; month <= 3; month++) {
      await prisma.payrollRecord.create({
        data: {
          userId: user.id, month, year: currentYear,
          basicSalary, hra, specialAllowance, transportAllowance, medicalAllowance,
          grossSalary, pfEmployee, pfEmployer, professionalTax, tds, esiEmployee,
          totalDeductions, netSalary, status: 'PAID',
          paidAt: new Date(currentYear, month - 1, 28),
        },
      });
    }
  }

  // Create sample leave requests
  const emp1 = employees[0];
  const leaveReq = await prisma.leaveRequest.create({
    data: {
      userId: emp1.id, leaveTypeId: casualLeave.id,
      startDate: new Date(currentYear, 4, 20), endDate: new Date(currentYear, 4, 22),
      totalDays: 3, reason: 'Family function - attending cousin\'s wedding',
      status: 'PENDING', appliedAt: new Date(),
    },
  });
  await prisma.approvalRequest.create({
    data: { requestType: 'LEAVE', referenceId: leaveReq.id, requestedById: emp1.id, status: 'PENDING' },
  });

  // Sample notifications
  for (const user of allUsers.slice(0, 5)) {
    await prisma.notification.create({
      data: { userId: user.id, title: 'Welcome to Harrsh HR', message: 'Your account has been set up successfully. Explore the dashboard to get started.', type: 'SUCCESS', isRead: false },
    });
    await prisma.notification.create({
      data: { userId: user.id, title: 'March Payslip Available', message: 'Your payslip for March has been generated. You can download it from the Payroll section.', type: 'INFO', isRead: false, actionUrl: '/payroll' },
    });
  }

  console.log('Seeding completed successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin:    admin@harrsh.com / Admin@123');
  console.log('  HR:       hr@harrsh.com / Hr@123');
  console.log('  Manager:  manager.eng@harrsh.com / Manager@123');
  console.log('  Employee: emp1@harrsh.com / Employee@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
