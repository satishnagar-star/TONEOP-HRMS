import { api } from "./api";

export async function fetchSystemLogs() {
  const res = await api.get("/system/logs");
  return res.data;
}

