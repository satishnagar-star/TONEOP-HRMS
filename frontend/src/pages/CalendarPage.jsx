import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Select } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { InlineLoader } from "../components/InlineLoader";
import { useAuth } from "../context/authStore";
import { fetchAttendance } from "../services/attendanceApi";
import { monthLabel, monthNow, parseGasDate } from "../utils/date";
import { normalizeStatus } from "../utils/status";

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

const statusBg = {
  Present: "bg-success",
  "Half Day": "bg-yellow-400",
  Absent: "bg-red-500",
  Holiday: "bg-accent",
  "Week Off": "bg-gray-400",
};

function buildCalendar(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthNow());
  const [hover, setHover] = useState(null);

  const query = useQuery({
    queryKey: ["attendance", user?.code, month],
    queryFn: () => fetchAttendance(user.code, month),
    enabled: Boolean(user?.code),
  });

  const map = useMemo(() => {
    const out = new Map();
    for (const a of query.data?.attendance ?? []) {
      const d = parseGasDate(a.date);
      if (!d) continue;
      out.set(d.toDateString(), a);
    }
    return out;
  }, [query.data]);

  const cells = useMemo(() => buildCalendar(month), [month]);

  return (
    <div className="space-y-4">
      <div className="w-full md:w-64">
        <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
          {monthOptions().map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </Select>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-text">Attendance calendar</div>
            {query.isFetching && <InlineLoader text="Fetching calendar..." />}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-black/55">
            {Object.keys(statusBg).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusBg[s]}`} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {query.isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <div className="relative">
            <div className="grid grid-cols-7 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-1 text-xs font-semibold text-black/45">
                  {d}
                </div>
              ))}
              {cells.map((d, idx) => {
                if (!d) return <div key={idx} className="h-16 rounded-xl bg-black/2" />;
                const a = map.get(d.toDateString());
                const s = normalizeStatus(a?.status);
                return (
                  <button
                    key={idx}
                    onMouseEnter={() => setHover(a ? { a, x: idx } : null)}
                    onMouseLeave={() => setHover(null)}
                    className="group relative h-16 rounded-xl border border-black/5 bg-white p-2 text-left hover:border-brand-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-semibold text-text">{d.getDate()}</div>
                      {s ? <div className={`h-2 w-2 rounded-full ${statusBg[s] || "bg-gray-300"}`} /> : null}
                    </div>
                    <div className="mt-1 text-xs text-black/50">{s || "—"}</div>
                    {a ? (
                      <div className="mt-1 text-[11px] text-black/45">
                        {a.in || "-"} → {a.out || "-"}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {hover?.a ? (
              <div className="pointer-events-none absolute left-0 top-0 mt-2 w-full">
                <div className="mx-auto max-w-md rounded-xl border border-black/10 bg-white p-4 shadow-soft">
                  <div className="text-sm font-semibold text-text">{hover.a.date}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div className="text-black/55">IN</div>
                    <div className="font-medium text-text">{hover.a.in || "-"}</div>
                    <div className="text-black/55">OUT</div>
                    <div className="font-medium text-text">{hover.a.out || "-"}</div>
                    <div className="text-black/55">Status</div>
                    <div className="font-medium text-text">{normalizeStatus(hover.a.status) || "-"}</div>
                    <div className="text-black/55">Late</div>
                    <div className="font-medium text-text">{hover.a.late ?? 0} minutes</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}

