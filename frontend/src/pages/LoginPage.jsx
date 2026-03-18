import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { login } from "../services/authApi";
import { authStore } from "../context/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = authStore((s) => s.setAuth);
  const [employeeCode, setEmployeeCode] = useState("BTP660");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(employeeCode.trim(), password);
      if (!data?.success || !data?.token) {
        const msg = data?.message || data?.msg || "Invalid employee code or password";
        toast.error(msg);
        return;
      }
      setAuth({ token: data.token, user: data.user });
      toast.success("Welcome back");
      navigate("/app/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto flex min-h-full max-w-[1200px] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="text-2xl font-bold text-text">Attendance Platform</div>
            <div className="mt-1 text-sm text-black/55">Login with your Employee Code</div>
          </div>

          <Card className="p-5">
            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                label="Employee Code"
                placeholder="e.g. BTP660"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                autoComplete="username"
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                loadingText="Signing in..."
              >
                Sign in
              </Button>
              <div className="text-xs text-black/50">
                Secured with MongoDB Atlas &amp; JWT authentication.
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

