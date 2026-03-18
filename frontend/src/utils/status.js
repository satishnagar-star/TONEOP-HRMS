export const statusColors = {
  Present: "bg-success/15 text-success ring-success/20",
  "Half Day": "bg-yellow-100 text-yellow-800 ring-yellow-200",
  Absent: "bg-red-100 text-red-700 ring-red-200",
  Holiday: "bg-blue-100 text-blue-700 ring-blue-200",
  "Week Off": "bg-gray-100 text-gray-700 ring-gray-200",
};

export function normalizeStatus(s) {
  if (!s) return "";
  const x = String(s).trim();
  if (x.toLowerCase() === "halfday" || x.toLowerCase() === "half day") return "Half Day";
  if (x.toLowerCase() === "weekoff" || x.toLowerCase() === "week off") return "Week Off";
  return x[0].toUpperCase() + x.slice(1);
}

