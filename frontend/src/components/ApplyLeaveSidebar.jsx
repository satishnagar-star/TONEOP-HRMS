import React, { useState } from 'react';
import { X, Send, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export function ApplyLeaveSidebar({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    subject: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In this system, we store tickets (comments) as leave requests if needed
      // or we could have a dedicated Leave model. 
      // The requirement says Module 12: Sidebar Form [From Date, To Date, Subject, Description]
      // Module 10: New Tab Approve/Reject Leave.
      
      // I'll create a dedicated LeaveRequest model/route or reuse comments with a 'Leave' category.
      // Let's create a simple LeaveRequest on the backend.
      await api.post('/employee/apply-leave', formData);
      toast.success('Leave application submitted!');
      onClose();
    } catch (err) {
      toast.error('Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="h-full w-full max-w-md bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text">Apply for Leave</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-black/5">
            <X className="h-5 w-5 text-black/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text">From Date</label>
              <input 
                type="date" 
                required
                value={formData.fromDate}
                onChange={(e) => setFormData({...formData, fromDate: e.target.value})}
                className="w-full rounded-xl border border-black/10 px-4 py-2" 
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text">To Date</label>
              <input 
                type="date" 
                required
                value={formData.toDate}
                onChange={(e) => setFormData({...formData, toDate: e.target.value})}
                className="w-full rounded-xl border border-black/10 px-4 py-2" 
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text">Subject</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Health Issue, Family Function"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="w-full rounded-xl border border-black/10 px-4 py-2" 
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text">Description</label>
            <textarea 
              required
              rows={4}
              placeholder="Provide more details about your leave request..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full rounded-xl border border-black/10 px-4 py-2" 
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-brand-600 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
            <span>Submit Application</span>
          </button>
        </form>
      </div>
    </div>
  );
}
