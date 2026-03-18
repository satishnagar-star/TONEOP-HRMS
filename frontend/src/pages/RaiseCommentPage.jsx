import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { EmptyState } from "../components/EmptyState";
import { createTicket, fetchMyTickets } from "../services/commentsApi";

export function RaiseCommentPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");

  const tickets = useQuery({
    queryKey: ["tickets", "my"],
    queryFn: fetchMyTickets,
  });

  const mut = useMutation({
    mutationFn: () => createTicket({ date, message }),
    onSuccess: async (data) => {
      if (data?.success) {
        toast.success("Ticket created");
        setDate("");
        setMessage("");
        await qc.invalidateQueries({ queryKey: ["tickets", "my"] });
      } else {
        toast.error("Could not create ticket");
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Could not create ticket"),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <div className="text-sm font-semibold text-text">Raise attendance issue</div>
        <div className="mt-1 text-sm text-black/55">Create a ticket for incorrect IN/OUT, status, or late minutes.</div>
        <div className="mt-4 space-y-3">
          <Input label="Date" placeholder='e.g. "10 Feb 2026"' value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="block">
            <div className="mb-1 text-sm font-medium text-text">Message</div>
            <textarea
              className="min-h-28 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand-300"
              placeholder="Describe the issue..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <Button
            onClick={() => mut.mutate()}
            disabled={!date.trim() || !message.trim()}
            loading={mut.isPending}
            loadingText="Submitting..."
          >
            Submit ticket
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-text">My tickets</div>
        <div className="mt-4 space-y-3">
          {tickets.isLoading ? (
            <div className="text-sm text-black/55">Loading...</div>
          ) : (tickets.data?.tickets?.length ?? 0) === 0 ? (
            <EmptyState title="No tickets yet" subtitle="Your submitted tickets will appear here." />
          ) : (
            <div className="space-y-2">
              {tickets.data.tickets.map((t) => (
                <div key={t.ticketId} className="rounded-xl border border-black/5 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-text">{t.ticketId}</div>
                    <div className="text-xs font-semibold text-black/55">{t.status}</div>
                  </div>
                  <div className="mt-1 text-sm text-black/70">{t.date}</div>
                  <div className="mt-2 text-sm text-black/70">{t.message}</div>
                  {t.reply ? (
                    <div className="mt-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
                      <div className="text-xs font-semibold uppercase tracking-wide">Reply</div>
                      <div className="mt-1">{t.reply}</div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

