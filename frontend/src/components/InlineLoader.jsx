export function InlineLoader({ text = "Fetching data..." }) {
  return (
    <div className="flex items-center gap-2 text-xs text-black/60">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
      <span>{text}</span>
    </div>
  );
}

