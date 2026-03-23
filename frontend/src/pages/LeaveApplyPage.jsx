import React, { useState, useEffect } from 'react';
import { FileText, Send, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import clsx from 'clsx';

export function LeaveApplyPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [formData, setFormData] = useState({
    date_start: '',
    date_end: '',
    subject: '',
    detail: ''
  });

  const fetchMyLeaves = async () => {
    try {
      const res = await api.get('/leaves/my-leaves');
      setLeaves(res.data.leaves || []);
    } catch (err) {
      console.error("Failed to fetch leaves", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert YYYY-MM-DD to DD/MM/YYYY
      const formatDate = (d) => {
        const parts = d.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      };

      const payload = {
        ...formData,
        date_start: formatDate(formData.date_start),
        date_end: formatDate(formData.date_end)
      };

      await api.post('/leaves/apply', payload);
      toast.success('Leave application submitted successfully');
      setFormData({ date_start: '', date_end: '', subject: '', detail: '' });
      fetchMyLeaves();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text text-brand-600">Apply for Leave</h1>
          <p className="text-sm text-black/55 font-medium">Submit your leave request for approval.</p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-soft ring-1 ring-black/5 border-t-4 border-brand-500">
           <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-black/30">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date_start}
                    onChange={(e) => setFormData({...formData, date_start: e.target.value})}
                    className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-black/30">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date_end}
                    onChange={(e) => setFormData({...formData, date_end: e.target.value})}
                    className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-black/30">Subject / Type</label>
                <input
                  type="text"
                  required
                  placeholder="Sick Leave / Personal Work..."
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm font-medium focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-black/30">Reason / Details</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Provide brief details about your leave request..."
                  value={formData.detail}
                  onChange={(e) => setFormData({...formData, detail: e.target.value})}
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm focus:border-brand-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 font-bold text-white transition hover:bg-brand-700 shadow-md transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Leave Request
              </button>
           </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-text">Application Status</h2>
          <p className="text-sm text-black/55 font-medium">Track your recent leave requests.</p>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
           {fetching ? (
             <div className="py-20 text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" /></div>
           ) : leaves.length === 0 ? (
             <div className="py-20 text-center text-black/30 font-medium">No leave requests found.</div>
           ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/[0.02] border-b border-black/5">
                    <tr>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-black/40">Dates</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-black/40">Subject</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-black/40 text-center">Days</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-black/40 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {leaves.map((l) => (
                      <tr key={l._id} className="hover:bg-black/[0.01] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-text">{l.date_start}</div>
                          <div className="text-[10px] text-black/40 font-bold">{l.date_end}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-text uppercase tracking-tight">{l.subject}</div>
                          <div className="text-xs text-black/40 truncate max-w-[200px]">{l.detail}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-brand-600">{l.days}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={clsx(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase",
                            l.status === 'Approved' && "bg-success/10 text-success",
                            l.status === 'Pending' && "bg-amber-100 text-amber-600",
                            l.status === 'Rejected' && "bg-red-50 text-red-500"
                          )}>
                            {l.status === 'Approved' && <CheckCircle className="h-3 w-3" />}
                            {l.status === 'Pending' && <Clock className="h-3 w-3" />}
                            {l.status === 'Rejected' && <XCircle className="h-3 w-3" />}
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
