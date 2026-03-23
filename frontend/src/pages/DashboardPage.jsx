import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calendar, Clock, LayoutDashboard } from "lucide-react";
import { Card } from "../components/Card";
import { Select } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { InlineLoader } from "../components/InlineLoader";
import { useAuth } from "../context/authStore";
import { fetchAttendance } from "../services/attendanceApi";
import { parse } from "date-fns";
import { monthLabel, monthNow } from "../utils/date";

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
    const daysInMonth = new Date(month.split('-')[0], month.split('-')[1], 0).getDate();
    const map = attendance.reduce((acc, a) => {
      const d = parse(a.date, "dd/MM/yyyy", new Date());
      if (d) acc[d.getDate()] = Number(a.late ?? 0);
      return acc;
    }, {});

    const full = [];
    for (let i = 1; i <= daysInMonth; i++) {
      full.push({ day: i, late: map[i] ?? 0 });
    }
    return full;
  }, [attendance, month]);

  const ratioData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Present", value: Number(stats.present ?? 0), fill: "#22C55E" },
      { name: "Absent", value: Number(stats.absent ?? 0), fill: "#EF4444" },
      { name: "Half Day", value: Number(stats.halfday ?? 0), fill: "#F59E0B" },
      { name: "Leave", value: Number(stats.leave ?? 0), fill: "#8B5CF6" },
      { name: "WFH", value: Number(stats.wfh ?? 0), fill: "#6366F1" },
      { name: "Holiday", value: Number(stats.holiday ?? 0), fill: "#38BDF8" },
      { name: "Week Off", value: Number(stats.weekoff ?? 0), fill: "#9CA3AF" },
    ].filter((x) => x.value > 0);
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between bg-white p-6 rounded-3xl shadow-soft ring-1 ring-black/5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 text-xl font-black">
               {user?.name?.charAt(0)}
            </div>
            <div>
              <div className="text-xl font-bold text-text">Welcome back, {user?.name.split(' ')[0]}</div>
              <div className="text-xs font-bold text-black/40 uppercase tracking-tight">
                Emp Code: {user?.code} • {user?.department || 'Member'}
              </div>
            </div>
            {q.isFetching && <InlineLoader text="Refreshing..." />}
          </div>
        </div>
        <div className="w-full md:w-64">
          <Select label="Viewing Month" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions().map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          <Stat label="Present" value={stats?.present} accent="bg-success" />
          <Stat label="Half Day" value={stats?.halfday} accent="bg-yellow-400" />
          <Stat label="Absent" value={stats?.absent} accent="bg-red-500" />
          <Stat label="Leave" value={stats?.leave} accent="bg-brand-500" />
          <Stat label="WFH" value={stats?.wfh} accent="bg-indigo-500" />
          <Stat label="WeekOff" value={stats?.weekoff} accent="bg-gray-400" />
          <Stat label="Holiday" value={stats?.holiday} accent="bg-sky-400" />
          <Stat label="Late Balance" value={`${stats?.total_late_minutes ?? 90}m`} accent="bg-amber-500" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2 rounded-3xl shadow-soft ring-1 ring-black/5">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text">Attendance Trend</h3>
            <div className="flex gap-2 text-xs font-bold text-black/40">
               <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-brand-600"></div> Late Mins</div>
            </div>
          </div>
          <div className="h-72 px-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                />
                <Line type="monotone" dataKey="late" stroke="#5B21B6" strokeWidth={3} dot={{ r: 3, fill: '#5B21B6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-3xl shadow-soft ring-1 ring-black/5">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-text">Ratio Analysis</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={ratioData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="45%" 
                  innerRadius={60} 
                  outerRadius={90} 
                  paddingAngle={5}
                  label={({ name, value }) => `${name} ${value}`}
                  labelLine={false}
                >
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
