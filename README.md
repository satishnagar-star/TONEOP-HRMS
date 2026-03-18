# Toneop-HRMS – Attendance Management System

A production-style **Attendance Management Platform** migrated from Google Sheets to a robust MongoDB-backed architecture.

## Features

- **Dashboard**: Real-time overview of attendance and system status.
- **Attendance Management**: Upload CSV attendance data, view by employee, department, or company-wide.
- **Ticket System**: Internal help-desk for employees to raise concerns and admins to reply.
- **Employee Management**: SuperAdmin can create/delete employees and manage roles.
- **System Logs**: Comprehensive audit trail for all critical actions.
- **Role-Based Access Control (RBAC)**: Supports `User`, `Admin`, and `SuperAdmin` roles.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS (Modern SaaS UI)
- **Backend**: Node.js + Express + JWT + Mongoose
- **Database**: MongoDB Atlas (Native connection)

## Setup & Installation

### 1. Prerequisites
- Node.js installed
- MongoDB Atlas account (for the connection string)

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `backend/.env` file:
```env
PORT=5000
JWT_SECRET=your_jwt_secret
FRONTEND_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/hrms
DATABASE_NAME=hrms
```

### 3. Database Seeding
To create the initial SuperAdmin user:
```bash
cd backend
node src/scripts/seed.js
```
**Default Credentials:** `BTP660` / `123456`

### 4. Frontend Setup
```bash
cd frontend
npm install
```

Create a `frontend/.env` file:
```env
VITE_API_BASE_URL=http://localhost:5000
```

## Running the Application

### Start Backend
```bash
cd backend
npm run dev
```

### Start Frontend
```bash
cd frontend
npm run dev
```

## API Documentation Summary

### Authentication
- `POST /auth/login` - Authenticate and get JWT token.
- `POST /auth/change-password` - Change logged-in user password.

### Attendance
- `GET /attendance/:employeeCode` - View personal or specific employee attendance.
- `GET /attendance/department/:dept` - View attendance for a specific department.
- `GET /attendance/all` - View all attendance records (SuperAdmin).
- `POST /attendance/upload` - Upload bulk attendance data via CSV.

### Comments/Tickets
- `POST /comments/create` - Raise a new ticket (User).
- `GET /comments/my` - View my raised tickets.
- `POST /comments/reply` - Reply to or resolve a ticket (Admin/SuperAdmin).
- `GET /comments/all` - View all tickets system-wide.

### Employees
- `POST /employee/create` - Create new employee accounts.
- `GET /employee/all` - List all employees.
- `DELETE /employee/:code` - Remove an employee record.

## Security
- Password hashing using `bcryptjs`.
- JWT-based authentication for all protected routes.
- Rate limiting and security headers (Helmet) implemented on the backend.

