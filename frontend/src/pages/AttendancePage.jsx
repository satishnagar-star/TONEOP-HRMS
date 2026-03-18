import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { Badge } from "../components/Badge";
import { EmptyState } from "../components/EmptyState";
import { InlineLoader } from "../components/InlineLoader";
import { useAuth } from "../context/authStore";
import { fetchAttendance } from "../services/attendanceApi";
import { monthLabel, monthNow } from "../utils/date";
import { normalizeStatus, statusColors } from "../utils/status";

function monthOptions() {
  const now = new Date();
  const out = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${d.getFullYear()}-${m}`);
  }
  return out;
}

export function AttendancePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthNow());
  const [status, setStatus] = useState("All");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const query = useQuery({
    queryKey: ["attendance", user?.code, month],
    queryFn: () => fetchAttendance(user.code, month),
    enabled: Boolean(user?.code),
  });

  const rows = useMemo(() => {
    const list = query.data?.attendance ?? [];
    const filtered = list.filter((r) => {
      const s = normalizeStatus(r.status);
      const matchesStatus = status === "All" ? true : s === status;
      const hay = `${r.date} ${r.in ?? ""} ${r.out ?? ""} ${s} ${r.late ?? ""}`.toLowerCase();
      const matchesQ = q.trim() ? hay.includes(q.trim().toLowerCase()) : true;
      return matchesStatus && matchesQ;
    });
    return filtered;
  }, [query.data, status, q]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-text">Attendance</div>
          {query.isFetching && <InlineLoader text="Fetching attendance..." />}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Select label="Month" value={month} onChange={(e) => (setMonth(e.target.value), setPage(1))}>
            {monthOptions().map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
            {["All", "Present", "Half Day", "Absent", "Holiday", "Week Off"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input label="Search" placeholder="Search date/status/time..." value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <div className="p-4">
            <Skeleton className="h-10" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No attendance rows" subtitle="Try changing the month/status filter." />
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/2">
                <tr className="border-b border-black/5 text-left">
                  <th className="px-4 py-3 font-semibold text-black/60">Date</th>
                  <th className="px-4 py-3 font-semibold text-black/60">IN</th>
                  <th className="px-4 py-3 font-semibold text-black/60">OUT</th>
                  <th className="px-4 py-3 font-semibold text-black/60">Status</th>
                  <th className="px-4 py-3 font-semibold text-black/60">Late Minutes</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const s = normalizeStatus(r.status);
                  return (
                    <tr key={`${r.date}-${r.in}-${r.out}`} className="border-b border-black/5 hover:bg-black/2">
                      <td className="px-4 py-3 font-medium text-text">{r.date}</td>
                      <td className="px-4 py-3 text-black/70">{r.in || "-"}</td>
                      <td className="px-4 py-3 text-black/70">{r.out || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[s] || "bg-black/5 text-black/70 ring-black/10"}>{s || "-"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-black/70">{r.late ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-black/55">
          Showing <span className="font-semibold text-text">{pageRows.length}</span> of{" "}
          <span className="font-semibold text-text">{rows.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/70 hover:bg-black/5 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <div className="text-sm text-black/55">
            Page <span className="font-semibold text-text">{page}</span> / {pageCount}
          </div>
          <button
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/70 hover:bg-black/5 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

