import { api } from "./api";

export async function createTicket(payload) {
  const res = await api.post("/comments/create", payload);
  return res.data;
}

export async function fetchMyTickets() {
  const res = await api.get("/comments/my");
  return res.data;
}

export async function fetchDepartmentTickets() {
  const res = await api.get("/comments/department");
  return res.data;
}

export async function fetchAllTickets() {
  const res = await api.get("/comments/all");
  return res.data;
}

export async function replyTicket(payload) {
  const res = await api.post("/comments/reply", payload);
  return res.data;
}

