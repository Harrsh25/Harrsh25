# Harrsh HR — Full-Stack HR Management System

A complete, production-ready Human Resource Management System built with modern technologies.

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **ORM**: Prisma 5 (SQLite by default, PostgreSQL-ready)
- **Auth**: JWT (access token 15min + refresh token 7days) + bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting (100 req/15min)

### Frontend
- **Build Tool**: Vite 5 + React 18
- **Routing**: React Router v6
- **Data Fetching**: TanStack React Query v5
- **State**: Zustand (auth + app store, persisted)
- **Forms**: React Hook Form + Zod validation
- **HTTP**: Axios with interceptors (auto token refresh)
- **UI**: Custom components + Lucide React icons + clsx

## Prerequisites
- Node.js 18 or higher
- npm 8 or higher

## Setup Instructions

### 1. Clone and Navigate
```bash
cd harrsh-hr-app
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init

# Seed the database with sample data
node prisma/seed.js
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install
```

## Running the Application

### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

Open your browser at `http://localhost:5173`

## Default Login Credentials

| Role     | Email                    | Password     |
|----------|--------------------------|--------------|
| Admin    | admin@harrsh.com         | Admin@123    |
| HR       | hr@harrsh.com            | Hr@123       |
| Manager  | manager.eng@harrsh.com   | Manager@123  |
| Employee | emp1@harrsh.com          | Employee@123 |

## Switching from SQLite to PostgreSQL

1. Install PostgreSQL and create a database
2. In `backend/prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"    // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Update `backend/.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/harrsh_hr"
   ```
4. Re-run migrations:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   node prisma/seed.js
   ```

## API Documentation

All endpoints are prefixed with `/api/v1/`

### Authentication
| Method | Endpoint                  | Description                | Auth |
|--------|---------------------------|----------------------------|------|
| POST   | /auth/register            | Register new user          | No   |
| POST   | /auth/login               | Login and get tokens       | No   |
| POST   | /auth/refresh             | Refresh access token       | No   |
| POST   | /auth/logout              | Logout and invalidate token| No   |
| GET    | /auth/me                  | Get current user profile   | Yes  |
| PUT    | /auth/change-password     | Change password            | Yes  |

### Users
| Method | Endpoint                     | Description              | Role      |
|--------|------------------------------|--------------------------|-----------|
| GET    | /users                       | List all users (paginated)| HR/ADMIN |
| GET    | /users/:id                   | Get user by ID           | Auth      |
| PUT    | /users/:id                   | Update user              | HR/ADMIN  |
| DELETE | /users/:id                   | Deactivate user          | ADMIN     |
| PUT    | /users/:id/photo             | Update profile photo     | Auth      |
| GET    | /users/:id/direct-reports    | Get direct reports       | Auth      |

### Attendance
| Method | Endpoint                    | Description               | Role       |
|--------|-----------------------------|---------------------------|------------|
| POST   | /attendance/check-in        | Check in for today        | Auth       |
| PUT    | /attendance/check-out       | Check out for today       | Auth       |
| GET    | /attendance/me              | My attendance records     | Auth       |
| GET    | /attendance/summary         | Monthly attendance summary| Auth       |
| GET    | /attendance                 | All attendance records    | Manager+   |
| GET    | /attendance/date/:date      | Attendance for a date     | Manager+   |

### Leave
| Method | Endpoint                  | Description                | Role      |
|--------|---------------------------|----------------------------|-----------|
| GET    | /leave/types              | Get all leave types        | Auth      |
| GET    | /leave/balance            | Get my leave balances      | Auth      |
| GET    | /leave/me                 | My leave requests          | Auth      |
| GET    | /leave/pending            | Pending approvals          | Manager+  |
| GET    | /leave/:id                | Get leave by ID            | Auth      |
| POST   | /leave                    | Apply for leave            | Auth      |
| PUT    | /leave/:id/cancel         | Cancel leave request       | Auth      |
| PUT    | /leave/:id/approve        | Approve leave              | Manager+  |
| PUT    | /leave/:id/reject         | Reject leave               | Manager+  |

### Payroll
| Method | Endpoint               | Description                  | Role    |
|--------|------------------------|------------------------------|---------|
| GET    | /payroll/me            | My payslips                  | Auth    |
| GET    | /payroll/summary       | Payroll summary              | HR/ADMIN|
| GET    | /payroll               | All payroll records          | HR/ADMIN|
| POST   | /payroll/process       | Process payroll for a month  | HR/ADMIN|
| GET    | /payroll/:id           | Get payslip by ID            | Auth    |

### Projects
| Method | Endpoint                          | Description           | Role      |
|--------|-----------------------------------|-----------------------|-----------|
| GET    | /projects/tasks/me                | My assigned tasks     | Auth      |
| GET    | /projects                         | List all projects     | Auth      |
| POST   | /projects                         | Create project        | Manager+  |
| GET    | /projects/:id                     | Get project           | Auth      |
| PUT    | /projects/:id                     | Update project        | Manager+  |
| DELETE | /projects/:id                     | Cancel project        | Manager+  |
| GET    | /projects/:id/tasks               | Get project tasks     | Auth      |
| POST   | /projects/:id/tasks               | Create task           | Manager+  |
| PUT    | /projects/:id/tasks/:taskId       | Update task           | Auth      |

### Approvals
| Method | Endpoint                   | Description           | Role     |
|--------|----------------------------|-----------------------|----------|
| GET    | /approvals/pending         | Pending approvals     | Manager+ |
| GET    | /approvals/:id             | Get approval by ID    | Auth     |
| PUT    | /approvals/:id/approve     | Approve request       | Manager+ |
| PUT    | /approvals/:id/reject      | Reject request        | Manager+ |

### Notifications
| Method | Endpoint                        | Description              | Role  |
|--------|---------------------------------|--------------------------|-------|
| GET    | /notifications                  | My notifications         | Auth  |
| GET    | /notifications/unread-count     | Get unread count         | Auth  |
| PUT    | /notifications/read-all         | Mark all as read         | Auth  |
| PUT    | /notifications/:id/read         | Mark notification read   | Auth  |

### Dashboard
| Method | Endpoint     | Description                     | Role  |
|--------|--------------|---------------------------------|-------|
| GET    | /dashboard   | Role-based dashboard stats      | Auth  |

## Folder Structure

```
harrsh-hr-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   ├── seed.js             # Database seeder
│   │   └── migrations/         # Migration files
│   ├── src/
│   │   ├── controllers/        # Business logic
│   │   ├── middleware/         # Auth, validation, error handler
│   │   ├── routes/             # Route definitions
│   │   ├── services/           # (extensible)
│   │   └── utils/              # JWT, response helpers
│   ├── uploads/                # File uploads
│   ├── .env.example
│   ├── package.json
│   └── server.js               # Express app entry
└── frontend/
    ├── src/
    │   ├── api/                # Axios API service functions
    │   ├── components/
    │   │   ├── layout/         # AppLayout, Header, BottomNav
    │   │   └── ui/             # Button, Input, Card, Modal, etc.
    │   ├── hooks/              # useAuth, useToast
    │   ├── pages/              # Screen components
    │   ├── store/              # Zustand stores (auth + app)
    │   └── utils/              # formatters, validators, constants
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Features by Role

### Employee
- Dashboard: Attendance today, leave balances, pending tasks
- Check In / Check Out with late detection
- Monthly attendance summary and history
- Apply for leave, view leave balance and history
- View payslips with earnings/deductions breakdown
- View all projects and assigned tasks
- Notifications (read/unread)
- Profile with change password

### Manager
- All employee features
- Team dashboard: who's present today, pending approvals
- Approve/Reject leave requests from direct reports
- View and manage team members
- Create and manage projects and tasks
- Approve/Reject all approval requests

### HR
- All employee features
- View all employees (paginated, filterable)
- Process payroll for all employees
- View all attendance records
- Approve/Reject all leave requests
- System-wide dashboard stats

### Admin
- All features from all roles
- Full user management (create, update, deactivate)
- System overview dashboard
- Access to all modules

## API Response Format

All API responses follow this consistent format:

```json
// Success
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "Error description",
  "errors": null
}
```
