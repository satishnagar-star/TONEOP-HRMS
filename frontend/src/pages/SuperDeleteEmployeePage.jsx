import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { deleteEmployee } from "../services/employeeApi";

export function SuperDeleteEmployeePage() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");

  const mut = useMutation({
    mutationFn: () => deleteEmployee(code.trim()),
    onSuccess: async (data) => {
      if (data?.success) {
        toast.success("Employee deleted");
        setCode("");
        await qc.invalidateQueries({ queryKey: ["employees", "all"] });
      } else {
        toast.error("Could not delete employee");
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Could not delete employee"),
  });

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-text">Delete employee (local registry)</div>
      <div className="mt-4 max-w-md space-y-3">
        <Input label="Employee Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. BTP660" />
        <Button
          variant="danger"
          onClick={() => mut.mutate()}
          disabled={!code.trim()}
          loading={mut.isPending}
          loadingText="Deleting..."
        >
          Delete employee
        </Button>
      </div>
    </Card>
  );
}

