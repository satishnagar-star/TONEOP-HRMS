import clsx from "clsx";

export function Badge({ className, ...props }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-black/10",
        className
      )}
      {...props}
    />
  );
}

