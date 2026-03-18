import clsx from "clsx";

export function Card({ className, ...props }) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-black/5 bg-white shadow-card",
        className
      )}
      {...props}
    />
  );
}

