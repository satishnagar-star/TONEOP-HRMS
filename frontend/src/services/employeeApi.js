import { api } from "./api";

export async function createEmployee(payload) {
  const res = await api.post("/employee/create", payload);
  return res.data;
}

export async function deleteEmployee(code) {
  const res = await api.delete(`/employee/${encodeURIComponent(code)}`);
  return res.data;
}

export async function updateEmployee(code, payload) {
  const res = await api.patch(`/employee/${encodeURIComponent(code)}`, payload);
  return res.data;
}

export async function fetchAllEmployees() {
  const res = await api.get("/employee/all");
  return res.data;
}

export async function fetchDepartmentEmployees() {
  const res = await api.get("/employee/department");
  return res.data;
}

