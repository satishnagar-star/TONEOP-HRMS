import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { fetchDepartmentEmployees } from "../services/employeeApi";

export function AdminDepartmentEmployeesPage() {
  const q = useQuery({ queryKey: ["employees", "department"], queryFn: fetchDepartmentEmployees });
  const list = q.data?.employees ?? [];

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-text">Department employees</div>
      <div className="mt-4">
        {q.isLoading ? (
          <div className="text-sm text-black/55">Loading...</div>
        ) : list.length === 0 ? (
          <EmptyState
            title="No employees in registry"
            subtitle="Super Admin can add employees to the local registry for department views."
          />
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left">
                  <th className="px-4 py-3 font-semibold text-black/60">Code</th>
                  <th className="px-4 py-3 font-semibold text-black/60">Name</th>
                  <th className="px-4 py-3 font-semibold text-black/60">Department</th>
                  <th className="px-4 py-3 font-semibold text-black/60">Role</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.code} className="border-b border-black/5 hover:bg-black/2">
                    <td className="px-4 py-3 font-medium text-text">{e.code}</td>
                    <td className="px-4 py-3 text-black/70">{e.name}</td>
                    <td className="px-4 py-3 text-black/70">{e.department}</td>
                    <td className="px-4 py-3 text-black/70">{e.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

