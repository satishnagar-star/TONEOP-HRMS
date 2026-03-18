import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit2, CheckCircle, XCircle, Clock, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import clsx from 'clsx';

export function SuperAllAttendancePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ employee: '', month: '', department: '' });
  const [editingRecord, setEditingRecord] = useState(null);
  const [insights, setInsights] = useState(null);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees/all');
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const fetchRecords = async (currentFilters = filters) => {
    setLoading(true);
    try {
      let url = '/attendance/all?';
      if (currentFilters.month) url += `month=${currentFilters.month}&`;
      if (currentFilters.department) url += `department=${currentFilters.department}&`;
      if (currentFilters.employee && currentFilters.employee.length < 10) { // If it's code/name from search
         url += `employee=${currentFilters.employee}&`;
      }
      
      const res = await api.get(url);
      setRecords(res.data.results || []);
    } catch (err) {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeInsights = async (code) => {
    if (!code) {
      setInsights(null);
      return;
    }
    try {
      const month = filters.month || new Date().toISOString().slice(0, 7);
      const res = await api.get(`/attendance/employee/${code}?month=${month}`);
      const data = res.data.attendance || [];
      
      const stats = {
        present: data.filter(r => r.status === 'Present').length,
        absent: data.filter(r => r.status === 'Absent').length,
        leave: data.filter(r => r.status === 'Leave').length,
        halfday: data.filter(r => r.status === 'Halfday').length,
        wfh: data.filter(r => r.status === 'WFH').length,
        late_minutes: data.reduce((acc, r) => acc + (r.late_minute || 0), 0),
        balance_leave: data.length > 0 ? data[0].balance_leave : 0,
        balance_late: data.length > 0 ? data[0].balance_late_minutes : 90
      };
      setInsights(stats);
    } catch (err) {
      console.error("Failed to fetch insights", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRecords();
  }, []);

  // When filtering by employee specifically, load insights
  useEffect(() => {
    if (filters.employee) {
      const match = records.find(r => 
        (r.employee_code?.toLowerCase() === filters.employee.toLowerCase()) ||
        (r.employee_name?.toLowerCase() === filters.employee.toLowerCase())
      );
      if (match) fetchEmployeeInsights(match.employee_code);
    } else {
      setInsights(null);
    }
  }, [filters.employee, filters.month]);

  const handleEdit = (record) => {
    setEditingRecord({ ...record });
  };

  const handleUpdate = async () => {
    try {
       await api.patch(`/attendance/record/${editingRecord._id}`, editingRecord);
       toast.success('Record updated');
       setEditingRecord(null);
       fetchRecords();
    } catch (err) {
       toast.error('Failed to update record');
    }
  };

  const filteredRecords = records.filter(r => {
    const searchStr = filters.employee?.toLowerCase() || "";
    const matchesEmp = !searchStr || 
      (r.employee_code?.toLowerCase().includes(searchStr)) ||
      (r.employee_name?.toLowerCase().includes(searchStr));
    return matchesEmp;
  });

  return (
    <div className="flex gap-6 relative">
      <div className={clsx("flex-1 space-y-6 transition-all", insights && "mr-80")}>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text">Attendance Management Explorer</h1>
          <p className="text-sm text-black/55">Monitor and override attendance, leave, and late balances.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-black/40" />
            <select
              value={filters.employee}
              onChange={(e) => {
                const newF = { ...filters, employee: e.target.value };
                setFilters(newF);
                if (e.target.value) fetchRecords(newF);
              }}
              className="w-full rounded-xl border border-black/10 pl-10 pr-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none bg-white font-medium"
            >
              <option value="">Search or Select Employee...</option>
              {employees.map(emp => (
                <option key={emp.code} value={emp.code}>{emp.name} ({emp.code})</option>
              ))}
            </select>
          </div>
          
          <div className="w-40">
            <input
              type="month"
              value={filters.month}
              onChange={(e) => {
                const newF = { ...filters, month: e.target.value };
                setFilters(newF);
                fetchRecords(newF);
              }}
              className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm focus:border-brand-500"
            />
          </div>
          <div className="w-40">
            <select 
              value={filters.department} 
              onChange={(e) => {
                const newF = { ...filters, department: e.target.value };
                setFilters(newF);
                fetchRecords(newF);
              }} 
              className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm focus:border-brand-500"
            >
              <option value="">All Depts</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Sales">Sales</option>
              <option value="Support">Support</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-4 py-4 font-semibold text-text">Employee</th>
                  <th className="px-4 py-4 font-semibold text-text">Date</th>
                  <th className="px-4 py-4 font-semibold text-text text-center">IN / OUT</th>
                  <th className="px-4 py-4 font-semibold text-text">Status</th>
                  <th className="px-4 py-4 font-semibold text-text text-center">Late Min</th>
                  <th className="px-4 py-4 font-semibold text-text text-center">Bal Leave</th>
                  <th className="px-4 py-4 font-semibold text-text text-center text-amber-600 italic">Bal Late</th>
                  <th className="px-4 py-4 font-semibold text-text text-right px-6">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 text-black/80">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan="8" className="py-10 text-center text-black/40">No records found for the selection.</td></tr>
                ) : filteredRecords.map((r, i) => (
                  <tr key={r._id || i} className="group transition hover:bg-black/[0.02]">
                    <td className="px-4 py-4">
                      <div className="font-bold text-primary">{r.employee_code}</div>
                      <div className="text-xs font-semibold text-black/60">{r.employee_name}</div>
                    </td>
                    <td className="px-4 py-4 font-medium">{r.date}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2 font-mono text-[10px]">
                        <span className="bg-success/10 px-1.5 py-0.5 rounded text-success">{r.time_in || '--:--'}</span>
                        <span className="text-black/20">→</span>
                        <span className="bg-red-50 px-1.5 py-0.5 rounded text-red-500">{r.time_out || '--:--'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx(
                        "rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
                        r.status === "Present" && "bg-success/10 text-success",
                        r.status === "Absent" && "bg-red-100 text-red-600",
                        r.status === "Half Day" && "bg-yellow-100 text-yellow-700",
                        r.status === "Leave" && "bg-brand-100 text-brand-700",
                        r.status === "Holiday" && "bg-blue-100 text-blue-700",
                        r.status === "WeekOff" && "bg-gray-100 text-gray-600",
                        r.status === "WFH" && "bg-indigo-100 text-indigo-700",
                        r.status === "Short Leave" && "bg-orange-100 text-orange-700"
                      )}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-red-500">{r.late_minute || 0}</td>
                    <td className="px-4 py-4 text-center font-bold text-brand-600">{r.balance_leave}</td>
                    <td className="px-4 py-4 text-center font-bold text-amber-600">{r.balance_late_minutes}m</td>
                    <td className="px-4 py-4 text-right px-6">
                      <button onClick={() => handleEdit(r)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Employee Insights Sidebar */}
      {insights && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl border-l border-black/5 p-6 animate-in slide-in-from-right duration-300 z-40 overflow-y-auto">
          <div className="flex flex-col gap-6 pt-16">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">Monthly Insights</h2>
              <button onClick={() => setInsights(null)} className="p-1 hover:bg-black/5 rounded-full">
                <XCircle className="h-5 w-5 text-black/30" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-success/5 p-4 border border-success/10 text-center">
                <div className="text-2xl font-black text-success">{insights.present}</div>
                <div className="text-[10px] font-bold uppercase text-success/60">Present</div>
              </div>
              <div className="rounded-2xl bg-red-50 p-4 border border-red-100 text-center">
                <div className="text-2xl font-black text-red-600">{insights.absent}</div>
                <div className="text-[10px] font-bold uppercase text-red-400">Absent</div>
              </div>
              <div className="rounded-2xl bg-brand-50 p-4 border border-brand-100 text-center">
                <div className="text-2xl font-black text-brand-600">{insights.leave}</div>
                <div className="text-[10px] font-bold uppercase text-brand-400">Leaves</div>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4 border border-indigo-100 text-center">
                <div className="text-2xl font-black text-indigo-600">{insights.wfh}</div>
                <div className="text-[10px] font-bold uppercase text-indigo-400">WFH</div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-black/5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-black/50 font-medium">Late Minutes Used</span>
                <span className="font-bold text-amber-600">{insights.late_minutes}m</span>
              </div>
              <div className="flex justify-between items-center text-sm text-brand-600 bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                <span className="font-bold uppercase text-[10px]">Remaining Leave Bal</span>
                <span className="text-xl font-black">{insights.balance_leave}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
                <span className="font-bold uppercase text-[10px]">Remaining Late Pool</span>
                <span className="text-xl font-black">{insights.balance_late}m</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-text">Edit Attendance Record</h2>
                <div className="text-xs text-black/40 font-bold uppercase">{editingRecord.employee_name} ({editingRecord.employee_code}) - {editingRecord.date}</div>
              </div>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="mb-1 block text-xs font-bold uppercase text-black/40">Check In</label>
                       <input type="time" value={editingRecord.time_in || ''} onChange={(e) => setEditingRecord({...editingRecord, time_in: e.target.value})} className="w-full rounded-xl border border-black/10 px-4 py-2" />
                    </div>
                    <div>
                       <label className="mb-1 block text-xs font-bold uppercase text-black/40">Check Out</label>
                       <input type="time" value={editingRecord.time_out || ''} onChange={(e) => setEditingRecord({...editingRecord, time_out: e.target.value})} className="w-full rounded-xl border border-black/10 px-4 py-2" />
                    </div>
                 </div>
                 <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-black/40">Status</label>
                    <select value={editingRecord.status} onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value})} className="w-full rounded-xl border border-black/10 px-4 py-2">
                       <option>Present</option>
                       <option>Absent</option>
                       <option>Half Day</option>
                       <option>Leave</option>
                       <option>Short Leave</option>
                       <option>WFH</option>
                       <option>Holiday</option>
                       <option>WeekOff</option>
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-brand-600">Balance Leave</label>
                      <input type="number" value={editingRecord.balance_leave} onChange={(e) => setEditingRecord({...editingRecord, balance_leave: parseFloat(e.target.value)})} className="w-full rounded-xl border border-brand-100 bg-brand-50/20 px-4 py-2 font-bold text-brand-700" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-amber-600">Late Bal (min)</label>
                      <input type="number" value={editingRecord.balance_late_minutes} onChange={(e) => setEditingRecord({...editingRecord, balance_late_minutes: parseInt(e.target.value)})} className="w-full rounded-xl border-amber-100 bg-amber-50/20 px-4 py-2 font-bold text-amber-700" />
                    </div>
                 </div>
              </div>
              <div className="mt-8 flex gap-3">
                 <button onClick={() => setEditingRecord(null)} className="flex-1 rounded-xl bg-black/5 py-3 font-bold text-black/70 hover:bg-black/10">Cancel</button>
                 <button onClick={handleUpdate} className="flex-1 rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 shadow-md">Update Record</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
