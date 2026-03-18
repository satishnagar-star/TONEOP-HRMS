import { Card } from "../components/Card";

export function PlaceholderPage({ title, subtitle }) {
  return (
    <Card className="p-6">
      <div className="text-lg font-bold text-text">{title}</div>
      {subtitle ? <div className="mt-2 text-sm text-black/55">{subtitle}</div> : null}
    </Card>
  );
}

