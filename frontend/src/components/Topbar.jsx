import { Menu } from "lucide-react";

export function Topbar({ title, user, onOpenMobileNav }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden rounded-xl bg-black/5 p-2 hover:bg-black/10"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <div className="text-sm font-semibold text-text">{title}</div>
          {user ? (
            <div className="text-xs text-black/55">
              {user.name} • {user.department} • {user.role}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

