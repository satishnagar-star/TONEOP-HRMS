import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { authStore } from "../context/authStore";
import toneopLogo from "../assets/toneop-logo.png";

const iconMap = {
  dashboard: LayoutDashboard,
  attendance: ClipboardList,
  calendar: CalendarDays,
  reports: ChartNoAxesCombined,
  tickets: MessageSquareText,
  settings: Settings,
  users: Users,
  admin: Shield,
  logs: FileText,
};

function NavItem({ to, label, icon }) {
  const Icon = iconMap[icon] || LayoutDashboard;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
          isActive ? "bg-brand-50 text-brand-700" : "text-black/70 hover:bg-black/5"
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar({ role }) {
  const logout = authStore((s) => s.logout);

  const common = [
    { to: "/app/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/app/attendance", label: "Attendance", icon: "attendance" },
    { to: "/app/calendar", label: "Calendar", icon: "calendar" },
    { to: "/app/reports", label: "Reports", icon: "reports" },
    { to: "/app/raise-comment", label: "Raise Comment", icon: "tickets" },
    { to: "/app/settings", label: "Settings", icon: "settings" },
  ];

  const admin = [
    { to: "/app/admin/department-employees", label: "Department Employees", icon: "users" },
    { to: "/app/admin/reply-comments", label: "Reply Comments", icon: "tickets" },
    { to: "/app/admin/department-reports", label: "Department Reports", icon: "reports" },
  ];

  const superAdmin = [
    { to: "/app/super/all-employees", label: "All Employees", icon: "users" },
    { to: "/app/super/create-employee", label: "Create Employee", icon: "users" },
    { to: "/app/super/delete-employee", label: "Delete Employee", icon: "users" },
    { to: "/app/super/upload-attendance", label: "Upload Attendance", icon: "attendance" },
    { to: "/app/super/system-logs", label: "System Logs", icon: "logs" },
    { to: "/app/super/all-tickets", label: "All Tickets", icon: "tickets" },
  ];

  const sections = [
    { title: "Menu", items: common },
    ...(role === "Admin" ? [{ title: "Admin", items: admin }] : []),
    ...(role === "SuperAdmin"
      ? [
          { title: "Admin", items: admin },
          { title: "Super Admin", items: superAdmin },
        ]
      : []),
  ];

  return (
    <aside className="flex h-full w-72 flex-col border-r border-black/5 bg-white">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-card">
            <img
              src={toneopLogo}
              alt="ToneOp"
              className="max-h-8 max-w-8 object-contain"
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-text">Attendance</div>
            <div className="text-xs text-black/55">Management Platform</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-auto px-4 pb-4">
        {sections.map((s) => (
          <div key={s.title}>
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-black/40">
              {s.title}
            </div>
            <div className="space-y-1">
              {s.items.map((it) => (
                <NavItem key={it.to} {...it} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-black/5 p-4">
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-sm font-semibold text-black/70 hover:bg-black/10"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

