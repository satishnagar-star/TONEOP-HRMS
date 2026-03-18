import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { Select } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { InlineLoader } from "../components/InlineLoader";
import { useAuth } from "../context/authStore";
import { fetchAttendance } from "../services/attendanceApi";
import { monthLabel, monthNow, parseGasDate } from "../utils/date";

function Stat({ label, value, accent }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-black/45">{label}</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-2xl font-bold text-text">{value ?? "-"}</div>
        <div className={`h-2 w-10 rounded-full ${accent}`} />
      </div>
    </Card>
  );
}

function monthOptions() {
  const now = new Date();
  const out = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${d.getFullYear()}-${m}`);
  }
  return out;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthNow());

  const q = useQuery({
    queryKey: ["attendance", user?.code, month],
    queryFn: () => fetchAttendance(user.code, month),
    enabled: Boolean(user?.code),
  });

  const stats = q.data?.stats;
  const attendance = q.data?.attendance ?? [];

  const trendData = useMemo(() => {
    // simple daily late minutes line chart
    return attendance
      .map((a) => {
        const d = parseGasDate(a.date);
        return {
          day: d ? d.getDate() : a.date,
          late: Number(a.late ?? 0),
          status: a.status,
        };
      })
      .sort((a, b) => Number(a.day) - Number(b.day));
  }, [attendance]);

  const ratioData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Present", value: Number(stats.present ?? 0), fill: "#22C55E" },
      { name: "Absent", value: Number(stats.absent ?? 0), fill: "#EF4444" },
      { name: "Half Day", value: Number(stats.halfday ?? 0), fill: "#F59E0B" },
      { name: "Holiday", value: Number(stats.holiday ?? 0), fill: "#38BDF8" },
      { name: "Week Off", value: Number(stats.weekoff ?? 0), fill: "#9CA3AF" },
    ].filter((x) => x.value > 0);
  }, [stats]);

  const barData = useMemo(() => {
    if (!stats) return [];
    return [
      { k: "Present", v: Number(stats.present ?? 0), fill: "#22C55E" },
      { k: "Half", v: Number(stats.halfday ?? 0), fill: "#F59E0B" },
      { k: "Absent", v: Number(stats.absent ?? 0), fill: "#EF4444" },
      { k: "Late", v: Number(stats.late ?? 0), fill: "#5B21B6" },
    ];
  }, [stats]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-lg font-bold text-text">Overview</div>
              <div className="text-sm text-black/55">
                {user?.name} • {user?.code}
              </div>
            </div>
            {q.isFetching && <InlineLoader text="Fetching data..." />}
          </div>
        </div>
        <div className="w-full md:w-64">
          <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions().map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Present" value={stats?.present} accent="bg-success" />
          <Stat label="Half Days" value={stats?.halfday} accent="bg-yellow-400" />
          <Stat label="Absent" value={stats?.absent} accent="bg-red-500" />
          <Stat label="Late Mins" value={stats?.late} accent="bg-brand-600" />
          <Stat label="Balance Leave" value={user?.leave_balance ?? 0} accent="bg-brand-400" />
          <Stat label="Balance Late" value={90 - (user?.total_late_minutes ?? 0)} accent="bg-brand-800" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 text-sm font-semibold text-text">Monthly attendance trend (late minutes)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="late" stroke="#5B21B6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold text-text">Present vs absent ratio</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie data={ratioData} dataKey="value" nameKey="name" outerRadius={90} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold text-text">Summary</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
              <XAxis dataKey="k" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="v" fill="#5B21B6" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

