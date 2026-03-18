import { api } from "./api";

export async function login(employeeCode, password) {
  const res = await api.post("/auth/login", { employeeCode, password });
  return res.data;
}

export async function changePassword(newPassword, employeeCode) {
  const res = await api.post("/auth/change-password", { newPassword, employeeCode });
  return res.data;
}

