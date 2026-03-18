import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/authStore";

export function RequireAuth() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}

