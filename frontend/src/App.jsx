import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";

import { queryClient } from "./services/queryClient";
import { RequireAuth, RequireRole } from "./components/Guards";
import { AppShell } from "./layouts/AppShell";

import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AttendancePage } from "./pages/AttendancePage";
import { CalendarPage } from "./pages/CalendarPage";
import { RaiseCommentPage } from "./pages/RaiseCommentPage";
import { AdminDepartmentEmployeesPage } from "./pages/AdminDepartmentEmployeesPage";
import { AdminReplyCommentsPage } from "./pages/AdminReplyCommentsPage";
import { SuperAllEmployeesPage } from "./pages/SuperAllEmployeesPage";
import { SuperCreateEmployeePage } from "./pages/SuperCreateEmployeePage";
import { SuperSystemLogsPage } from "./pages/SuperSystemLogsPage";
import { SuperAllTicketsPage } from "./pages/SuperAllTicketsPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SuperUploadAttendancePage } from "./pages/SuperUploadAttendancePage";
import { HolidayPage } from "./pages/HolidayPage";
import { SuperAllAttendancePage } from "./pages/SuperAllAttendancePage";
import { LeaveManagementPage } from "./pages/LeaveManagementPage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AppShell />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="reports" element={<PlaceholderPage title="Reports" subtitle="Coming next: exportable department & org reports." />} />
              <Route path="raise-comment" element={<RaiseCommentPage />} />
              <Route path="settings" element={<SettingsPage />} />

              <Route element={<RequireRole roles={["Admin", "SuperAdmin"]} />}>
                <Route path="admin/department-employees" element={<AdminDepartmentEmployeesPage />} />
                <Route path="admin/reply-comments" element={<AdminReplyCommentsPage />} />
                <Route path="admin/department-reports" element={<PlaceholderPage title="Department Reports" subtitle="Coming next: department analytics and exports." />} />
                <Route path="admin/leave-management" element={<LeaveManagementPage />} />
              </Route>

              <Route element={<RequireRole roles={["SuperAdmin"]} />}>
                <Route path="super/all-employees" element={<SuperAllEmployeesPage />} />
                <Route path="super/create-employee" element={<SuperCreateEmployeePage />} />
                <Route path="super/upload-attendance" element={<SuperUploadAttendancePage />} />
                <Route path="super/system-logs" element={<SuperSystemLogsPage />} />
                <Route path="super/all-tickets" element={<SuperAllTicketsPage />} />
                <Route path="super/holiday-list" element={<HolidayPage />} />
                <Route path="super/all-attendance" element={<SuperAllAttendancePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "12px", background: "white", color: "#111827" },
          }}
        />
      </BrowserRouter>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
