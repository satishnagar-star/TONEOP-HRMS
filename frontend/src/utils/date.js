export function monthNow() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export function monthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function parseGasDate(dateStr) {
  // GAS returns e.g. "10 Feb 2026"
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d;
  const parts = String(dateStr).split(" ");
  if (parts.length >= 3) {
    const [day, mon, year] = parts;
    const guess = new Date(`${mon} ${day}, ${year}`);
    if (!Number.isNaN(guess.getTime())) return guess;
  }
  return null;
}

