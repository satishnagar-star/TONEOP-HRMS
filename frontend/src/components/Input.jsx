import clsx from "clsx";

export function Input({ className, label, hint, error, ...props }) {
  return (
    <label className="block">
      {label ? <div className="mb-1 text-sm font-medium text-text">{label}</div> : null}
      <input
        className={clsx(
          "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand-300",
          error ? "border-red-300 focus:ring-red-200" : "",
          className
        )}
        {...props}
      />
      {error ? <div className="mt-1 text-xs text-red-600">{error}</div> : null}
      {hint && !error ? <div className="mt-1 text-xs text-black/50">{hint}</div> : null}
    </label>
  );
}

