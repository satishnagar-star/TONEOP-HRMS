import { api } from "./api";

export async function fetchAttendance(employeeCode, month) {
  const res = await api.get(`/attendance/${encodeURIComponent(employeeCode)}`, { params: { month } });
  return res.data;
}

export async function fetchDepartmentAttendance(dept, month) {
  const res = await api.get(`/attendance/department/${encodeURIComponent(dept)}`, { params: { month } });
  return res.data;
}

export async function fetchAllAttendance(month) {
  const res = await api.get("/attendance/all", { params: { month } });
  return res.data;
}

