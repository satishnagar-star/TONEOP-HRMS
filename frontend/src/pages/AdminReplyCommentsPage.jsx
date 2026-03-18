import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { fetchDepartmentTickets, replyTicket } from "../services/commentsApi";

export function AdminReplyCommentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("Resolved");

  const tickets = useQuery({
    queryKey: ["tickets", "department"],
    queryFn: fetchDepartmentTickets,
  });

  const list = useMemo(() => tickets.data?.tickets ?? [], [tickets.data]);

  const mut = useMutation({
    mutationFn: () => replyTicket({ ticketId: active.ticketId, reply, status }),
    onSuccess: async (data) => {
      if (data?.success) {
        toast.success("Reply sent");
        setOpen(false);
        setActive(null);
        setReply("");
        await qc.invalidateQueries({ queryKey: ["tickets", "department"] });
      } else {
        toast.error("Could not reply");
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Could not reply"),
  });

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-text">Department tickets</div>
      <div className="mt-4">
        {tickets.isLoading ? (
          <div className="text-sm text-black/55">Loading...</div>
        ) : list.length === 0 ? (
          <EmptyState title="No tickets" subtitle="Tickets raised by your department will appear here." />
        ) : (
          <div className="space-y-2">
            {list.map((t) => (
              <div key={t.ticketId} className="rounded-xl border border-black/5 bg-white p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-text">{t.ticketId}</div>
                    <div className="text-xs text-black/55">
                      {t.employeeCode} • {t.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-black/55">{t.status}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActive(t);
                        setReply(t.reply || "");
                        setStatus(t.status || "Resolved");
                        setOpen(true);
                      }}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={active ? `Reply to ${active.ticketId}` : "Reply"}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => mut.mutate()}
              disabled={!active || !reply.trim()}
              loading={mut.isPending}
              loadingText="Sending..."
            >
              Send reply
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Open">Open</option>
            <option value="Resolved">Resolved</option>
          </Select>
          <label className="block">
            <div className="mb-1 text-sm font-medium text-text">Reply</div>
            <textarea
              className="min-h-28 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand-300"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write your reply..."
            />
          </label>
          {active ? (
            <Input
              label="Context"
              value={`${active.employeeCode} • ${active.date}`}
              readOnly
            />
          ) : null}
        </div>
      </Modal>
    </Card>
  );
}

