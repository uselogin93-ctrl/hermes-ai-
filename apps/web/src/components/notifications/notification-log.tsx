import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/summary-strip";

export type NotificationEntry = {
  id: string;
  channel: string;
  kind: string;
  message: string;
  status: string;
  error: string | null;
  createdAt: Date;
};

function statusTone(status: string): "success" | "danger" | "neutral" {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  return "neutral";
}

function formatTimestamp(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

/** The delivery log: every notification attempt, newest first. */
export function NotificationLog({
  entries,
  timeZone,
}: {
  entries: NotificationEntry[];
  timeZone: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery log</CardTitle>
        <p className="text-[12px] text-muted-foreground">
          Every notification the system tried to send, with the outcome the provider reported.
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {entries.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              title="No notifications yet"
              description="The first message is sent when a daily cycle produces a draft that is waiting for review. Until then the log stays empty."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-y border-border bg-surface-muted/60">
                  <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Channel
                  </th>
                  <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Kind
                  </th>
                  <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Message
                  </th>
                  <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Sent
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border align-top transition-colors last:border-b-0 hover:bg-surface-muted/50"
                  >
                    <td className="px-5 py-3 text-[13px] capitalize text-foreground">
                      {entry.channel}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-muted-foreground">
                      {entry.kind}
                    </td>
                    <td className="max-w-[360px] px-5 py-3 text-[13px] leading-relaxed text-foreground">
                      <span className="line-clamp-2 break-words">
                        {entry.message.length > 160 ? `${entry.message.slice(0, 160)}…` : entry.message}
                      </span>
                      {entry.error ? (
                        <span className="mt-1 block text-[11px] text-danger">{entry.error}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(entry.status)}>{entry.status}</Badge>
                    </td>
                    <td className="numeric whitespace-nowrap px-5 py-3 text-right text-[12px] text-muted-foreground">
                      {formatTimestamp(entry.createdAt, timeZone)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
