import { useEffect } from "react";

export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-black/10 bg-white shadow-soft">
        <div className="px-5 py-4">
          <div className="text-base font-semibold text-text">{title}</div>
        </div>
        <div className="px-5 pb-5">{children}</div>
        {footer ? <div className="border-t border-black/5 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

