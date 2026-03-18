export function EmptyState({ title = "No data", subtitle }) {
  return (
    <div className="rounded-xl border border-dashed border-black/10 bg-white p-8 text-center">
      <div className="text-sm font-semibold text-text">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-black/55">{subtitle}</div> : null}
    </div>
  );
}

