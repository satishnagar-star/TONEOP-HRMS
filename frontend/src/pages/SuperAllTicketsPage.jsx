import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { fetchAllTickets } from "../services/commentsApi";

export function SuperAllTicketsPage() {
  const tickets = useQuery({ queryKey: ["tickets", "all"], queryFn: fetchAllTickets });
  const list = tickets.data?.tickets ?? [];

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-text">All tickets</div>
      <div className="mt-4">
        {tickets.isLoading ? (
          <div className="text-sm text-black/55">Loading...</div>
        ) : list.length === 0 ? (
          <EmptyState title="No tickets" subtitle="System-wide tickets will appear here." />
        ) : (
          <div className="space-y-2">
            {list.map((t) => (
              <div key={t.ticketId} className="rounded-xl border border-black/5 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-text">{t.ticketId}</div>
                  <div className="text-xs font-semibold text-black/55">{t.status}</div>
                </div>
                <div className="mt-1 text-xs text-black/55">
                  {t.employeeCode} • {t.department} • {t.date}
                </div>
                <div className="mt-2 text-sm text-black/70">{t.message}</div>
                {t.reply ? (
                  <div className="mt-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">{t.reply}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

