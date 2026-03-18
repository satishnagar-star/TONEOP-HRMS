import clsx from "clsx";

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
    secondary: "bg-success text-white hover:bg-success/90 shadow-sm",
    ghost: "bg-transparent hover:bg-black/5 text-text",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  };
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };

  const spinner =
    variant === "primary" || variant === "secondary" || variant === "danger"
      ? "border-white/40 border-t-white"
      : "border-black/30 border-t-black/70";

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className={clsx(
            "h-4 w-4 animate-spin rounded-full border-2",
            spinner
          )}
        />
      )}
      <span>{loading ? loadingText || "Processing..." : children}</span>
    </button>
  );
}

