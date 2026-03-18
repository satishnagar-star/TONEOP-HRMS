import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/authStore";

function titleFromPath(pathname) {
  const p = pathname.replace("/app/", "");
  if (!p || p === "dashboard") return "Dashboard";
  return p
    .split("/")
    .map((s) => s.replace(/-/g, " "))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" • ");
}

export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const title = useMemo(() => titleFromPath(location.pathname), [location.pathname]);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-full bg-bg">
      <div className="mx-auto flex h-full max-w-[1400px]">
        <div className="hidden h-full md:block">
          <Sidebar role={user?.role} />
        </div>

        <div className="flex h-full min-w-0 flex-1 flex-col">
          <Topbar title={title} user={user} onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      <Modal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Navigation"
        footer={null}
      >
        <div className="h-[70vh] overflow-auto">
          <Sidebar role={user?.role} />
        </div>
      </Modal>
    </div>
  );
}

