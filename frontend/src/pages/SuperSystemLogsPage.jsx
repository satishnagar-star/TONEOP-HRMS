import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { fetchSystemLogs } from "../services/systemApi";

export function SuperSystemLogsPage() {
  const q = useQuery({ queryKey: ["system", "logs"], queryFn: fetchSystemLogs });
  const logs = q.data?.logs ?? [];

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-text">System logs</div>
      <div className="mt-4">
        {q.isLoading ? (
          <div className="text-sm text-black/55">Loading...</div>
        ) : logs.length === 0 ? (
          <EmptyState title="No logs yet" subtitle="Actions like login, ticket updates, and employee edits are logged." />
        ) : (
          <div className="space-y-2">
            {logs.map((l, idx) => (
              <div key={idx} className="rounded-xl border border-black/5 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-text">{l.type}</div>
                  <div className="text-xs text-black/55">{l.at}</div>
                </div>
                <pre className="mt-2 overflow-auto rounded-xl bg-black/2 p-3 text-xs text-black/70">
{JSON.stringify(l, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

