# MINI HRMS – Attendance Management System

Production-style **Attendance Management Platform** with:

- **Frontend**: React + Vite + Tailwind (light SaaS dashboard UI)
- **Backend**: Node.js + Express + JWT (middleware API gateway)
- **Integration**: Backend consumes your existing **Google Apps Script API** (Google Sheets) via query params

## Architecture

React (Vite) → Express (JWT + RBAC + proxy) → Google Apps Script Web API → Google Sheets

**Important**: The frontend never calls GAS directly.

## Setup (Local Dev)

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start
```

Backend runs on `http://localhost:5000`.

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment Variables

Backend (`backend/.env`):

- `GAS_BASE_URL`: your GAS URL (must stay unchanged)
- `JWT_SECRET`: JWT signing secret
- `PORT`: default `5000`
- `FRONTEND_ORIGIN`: default `http://localhost:5173`

Frontend (`frontend/.env`):

- `VITE_API_BASE_URL`: backend base URL (default `http://localhost:5000`)

## API Summary

### Auth

- `POST /auth/login` → returns `{ success:true, token, user }` on success; otherwise passes through GAS response
- `POST /auth/change-password` (JWT) → proxies to GAS `changePassword`

### Attendance (JWT)

- `GET /attendance/:employeeCode?month=YYYY-MM` → **passes through GAS response structure unchanged**
- `GET /attendance/department/:dept?month=YYYY-MM` (Admin/SuperAdmin) → aggregates using local registry
- `GET /attendance/all?month=YYYY-MM` (SuperAdmin) → aggregates using local registry

### Tickets (JWT)

Local ticket system (does not touch Google Sheets):

- `POST /comments/create`
- `GET /comments/my`
- `GET /comments/department` (Admin/SuperAdmin)
- `POST /comments/reply` (Admin/SuperAdmin)
- `GET /comments/all` (SuperAdmin)

### Employees (JWT)

Local employee registry for department/all aggregation (does not touch Google Sheets):

- `POST /employee/create` (SuperAdmin)
- `DELETE /employee/:code` (SuperAdmin)
- `GET /employee/all` (SuperAdmin)
- `GET /employee/department` (Admin/SuperAdmin)

## Notes

- The backend calls GAS using **the exact query parameter format** you provided (`action=...` etc.).
- Attendance responses from GAS are returned **as-is** by `/attendance/:employeeCode`.

