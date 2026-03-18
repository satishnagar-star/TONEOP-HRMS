import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export function HolidayPage() {
  const [holidays, setHolidays] = useState([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/holiday');
      setHolidays(res.data.holidays);
    } catch (err) {
      toast.error('Failed to fetch holidays');
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert YYYY-MM-DD to DD/MM/YYYY for consistency if needed, 
      // but the model accepts String. Let's use DD/MM/YYYY.
      const dParts = date.split('-'); // 2026-02-01
      const formattedDate = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;

      await api.post('/holiday', { date: formattedDate, name });
      toast.success('Holiday added successfully');
      setName('');
      setDate('');
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to add holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/holiday/${id}`);
      toast.success('Holiday removed');
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to delete holiday');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text">Holiday Management</h1>
        <p className="text-sm text-black/55">Manage company-wide holidays. These are used for attendance status logic.</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-black/5">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-text">Holiday Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Independence Day"
              className="w-full rounded-xl border border-black/10 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="w-48">
            <label className="mb-1 block text-sm font-medium text-text">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-black/10 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Holiday
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-6 py-4 font-semibold text-text">Date</th>
              <th className="px-6 py-4 font-semibold text-text">Holiday Name</th>
              <th className="px-6 py-4 font-semibold text-text text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {holidays.map((h) => (
              <tr key={h._id} className="transition hover:bg-black/[0.02]">
                <td className="px-6 py-4 font-medium text-text">{h.date}</td>
                <td className="px-6 py-4 text-black/70">{h.name}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(h._id)}
                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {holidays.length === 0 && (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center text-black/40">
                  <Calendar className="mx-auto mb-2 h-8 w-8 opacity-20" />
                  <p>No holidays added yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
