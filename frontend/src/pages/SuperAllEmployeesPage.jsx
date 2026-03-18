import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { fetchAllEmployees, deleteEmployee, updateEmployee } from "../services/employeeApi";
import { toast } from "react-hot-toast";
import { Eye, Edit2, Trash2, UserPlus, X, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { useState } from "react";
import { Input } from "../components/Input";
import { Select } from "../components/Select";

export function SuperAllEmployeesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["employees", "all"], queryFn: fetchAllEmployees });
  const list = q.data?.employees ?? [];

  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const deleteMut = useMutation({
    mutationFn: (code) => deleteEmployee(code),
    onSuccess: () => {
      toast.success("Employee deleted successfully");
      qc.invalidateQueries({ queryKey: ["employees", "all"] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to delete employee")
  });

  const updateMut = useMutation({
    mutationFn: ({ code, payload }) => updateEmployee(code, payload),
    onSuccess: () => {
      toast.success("Employee updated successfully");
      setEditingEmployee(null);
      qc.invalidateQueries({ queryKey: ["employees", "all"] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to update employee")
  });

  const handleDelete = (code) => {
    if (window.confirm(`Are you sure you want to delete employee ${code}?`)) {
      deleteMut.mutate(code);
    }
  };

  const handleUpdateSubmit = () => {
    const { code, name, department, role, password } = editingEmployee;
    const payload = { name, department, role };
    if (password) payload.password = password;
    updateMut.mutate({ code, payload });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Employee Management</h1>
          <p className="text-sm text-black/55">View and manage all registered employees</p>
        </div>
        <Link to="/app/super/create-employee">
          <Button variant="primary" className="flex items-center gap-2">
            <UserPlus size={18} />
            <span>Add Employee</span>
          </Button>
        </Link>
      </div>

      <Card className="p-4 overflow-hidden">
        <div className="overflow-x-auto">
          {q.isLoading ? (
            <div className="py-10 text-center text-sm text-black/55">Loading employees...</div>
          ) : list.length === 0 ? (
            <EmptyState title="No employees yet" subtitle="Create employees to start managing your workforce." />
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-black/2">
                <tr className="border-b border-black/5 text-left">
                  <th className="px-6 py-4 font-semibold text-black/60 uppercase tracking-wider">Employee Code</th>
                  <th className="px-6 py-4 font-semibold text-black/60 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 font-semibold text-black/60 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 font-semibold text-black/60 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 font-semibold text-black/60 text-center uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {list.map((e) => (
                  <tr key={e.code} className="hover:bg-black/2 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">{e.code}</td>
                    <td className="px-6 py-4 text-text font-medium">{e.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-black/5 text-black/70 rounded-full text-xs font-semibold">
                        {e.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-black/70 font-medium">{e.role}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => setViewingEmployee(e)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => setEditingEmployee({ ...e, password: '' })}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(e.code)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Delete"
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* View Modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setViewingEmployee(null)} className="absolute right-4 top-4 p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} className="text-black/40" />
            </button>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-20 w-20 rounded-3xl bg-brand-50 flex items-center justify-center text-brand-600 text-3xl font-black shadow-inner ring-1 ring-brand-100">
                {viewingEmployee.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">{viewingEmployee.name}</h2>
                <p className="text-sm font-bold text-brand-600 uppercase tracking-tight">{viewingEmployee.code}</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-4 pt-4 border-t border-black/5 mt-2">
                <div className="p-3 rounded-2xl bg-black/[0.02] border border-black/[0.05]">
                  <p className="text-[10px] font-bold text-black/40 uppercase">Department</p>
                  <p className="font-bold text-text">{viewingEmployee.department}</p>
                </div>
                <div className="p-3 rounded-2xl bg-black/[0.02] border border-black/[0.05]">
                  <p className="text-[10px] font-bold text-black/40 uppercase">Role</p>
                  <p className="font-bold text-text">{viewingEmployee.role}</p>
                </div>
              </div>
              <Button onClick={() => setViewingEmployee(null)} className="w-full mt-4" variant="secondary">Close</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-200 shadow-2xl">
            <button onClick={() => setEditingEmployee(null)} className="absolute right-6 top-6 p-2 hover:bg-black/5 rounded-full">
              <X size={20} className="text-black/40" />
            </button>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-text">Edit Employee</h2>
              <p className="text-xs font-bold text-brand-600">{editingEmployee.code}</p>
            </div>
            
            <div className="space-y-4">
              <Input 
                label="Full Name" 
                value={editingEmployee.name} 
                onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})} 
              />
              <Input 
                label="Department" 
                value={editingEmployee.department} 
                onChange={(e) => setEditingEmployee({...editingEmployee, department: e.target.value})} 
              />
              <Select 
                label="Role" 
                value={editingEmployee.role} 
                onChange={(e) => setEditingEmployee({...editingEmployee, role: e.target.value})}
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </Select>
              <Input 
                label="New Password (optional)" 
                type="password"
                placeholder="Leave blank to keep current"
                value={editingEmployee.password} 
                onChange={(e) => setEditingEmployee({...editingEmployee, password: e.target.value})} 
              />
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="secondary" onClick={() => setEditingEmployee(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleUpdateSubmit} 
                className="flex-1 flex items-center justify-center gap-2"
                loading={updateMut.isPending}
                loadingText="Updating..."
              >
                <Save size={18} />
                Save Changes
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

