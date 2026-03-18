import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { createEmployee } from "../services/employeeApi";

export function SuperCreateEmployeePage() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("User");

  const mut = useMutation({
    mutationFn: () => createEmployee({ code: code.trim(), name: name.trim(), department: department.trim(), role }),
    onSuccess: async (data) => {
      if (data?.success) {
        toast.success("Employee created");
        setCode("");
        setName("");
        setDepartment("");
        setRole("User");
        await qc.invalidateQueries({ queryKey: ["employees", "all"] });
      } else {
        toast.error("Could not create employee");
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Could not create employee"),
  });

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-text">Create employee (local registry)</div>
      <div className="mt-1 text-sm text-black/55">
        This does not modify Google Sheets; it enables admin reporting endpoints like department/all attendance aggregation.
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input label="Employee Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. BTP660" />
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        <Input label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Sales" />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="User">User</option>
          <option value="Admin">Admin</option>
          <option value="SuperAdmin">SuperAdmin</option>
        </Select>
      </div>
      <div className="mt-4">
        <Button
          onClick={() => mut.mutate()}
          disabled={!code.trim() || !name.trim() || !department.trim()}
          loading={mut.isPending}
          loadingText="Creating..."
        >
          Create employee
        </Button>
      </div>
    </Card>
  );
}

