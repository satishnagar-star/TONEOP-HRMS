import clsx from "clsx";

export function Select({ className, label, children, ...props }) {
  return (
    <label className="block">
      {label ? <div className="mb-1 text-sm font-medium text-text">{label}</div> : null}
      <select
        className={clsx(
          "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand-300",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

