import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, Calendar, User, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import clsx from 'clsx';

export function LeaveManagementPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchAllLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaves/all');
      setLeaves(res.data.leaves || []);
    } catch (err) {
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLeaves();
  }, []);

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      if (action === 'approve') {
        await api.patch(`/leaves/approve/${id}`);
        toast.success('Leave request approved');
      } else {
        await api.patch(`/leaves/reject/${id}`);
        toast.success('Leave request rejected');
      }
      fetchAllLeaves();
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${action} leave`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text">Leave Management</h1>
        <p className="text-sm text-black/55 font-medium">Review and process employee leave applications.</p>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.02] border-b border-black/5">
              <tr>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-black/40">Employee</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-black/40">Duration</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-black/40">Subject & Details</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-black/40 text-center">Status</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-black/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td colSpan="5" className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" /></td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan="5" className="py-20 text-center text-black/30 font-bold">No leave requests found.</td></tr>
              ) : leaves.map((l) => (
                <tr key={l._id} className="hover:bg-black/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-black">
                        {l.employee_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-text">{l.employee_name}</div>
                        <div className="text-[10px] font-black text-brand-500 uppercase tracking-tight">{l.employee_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-bold text-text">
                      <Calendar className="h-3.5 w-3.5 text-black/20" />
                      {l.date_start} - {l.date_end}
                    </div>
                    <div className="text-[10px] font-black text-black/40 uppercase mt-0.5">{l.days} {l.days === 1 ? 'Day' : 'Days'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-text uppercase tracking-tight">{l.subject}</div>
                    <div className="text-xs text-black/40 line-clamp-1 max-w-sm">{l.detail}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase",
                      l.status === 'Approved' && "bg-success/10 text-success",
                      l.status === 'Pending' && "bg-amber-100 text-amber-600",
                      l.status === 'Rejected' && "bg-red-50 text-red-500"
                    )}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {l.status === 'Pending' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={processingId === l._id}
                          onClick={() => handleAction(l._id, 'approve')}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-success text-white hover:bg-success/90 shadow-sm transition hover:-translate-y-0.5"
                          title="Approve"
                        >
                          {processingId === l._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button
                          disabled={processingId === l._id}
                          onClick={() => handleAction(l._id, 'reject')}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-sm transition hover:-translate-y-0.5"
                          title="Reject"
                        >
                          {processingId === l._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-black/20 italic">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
