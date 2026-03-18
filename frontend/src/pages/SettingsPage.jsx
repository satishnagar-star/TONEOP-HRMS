import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../context/authStore";
import { changePassword } from "../services/authApi";

export function SettingsPage() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");

  const mut = useMutation({
    mutationFn: () => changePassword(newPassword),
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Password updated");
        setNewPassword("");
      } else {
        toast.error(data?.message || "Could not update password");
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Could not update password"),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <div className="text-sm font-semibold text-text">Profile</div>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-black/55">Employee Code</div>
            <div className="font-semibold text-text">{user?.code}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-black/55">Name</div>
            <div className="font-semibold text-text">{user?.name}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-black/55">Department</div>
            <div className="font-semibold text-text">{user?.department}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-black/55">Role</div>
            <div className="font-semibold text-text">{user?.role}</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-text">Change password</div>
        <div className="mt-4 space-y-3">
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 4 characters"
          />
          <Button
            onClick={() => mut.mutate()}
            disabled={newPassword.trim().length < 4}
            loading={mut.isPending}
            loadingText="Updating..."
          >
            Update password
          </Button>
        </div>
      </Card>
    </div>
  );
}

