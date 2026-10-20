"use client";

import * as React from "react";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type TestResponse = {
  status?: string;
  message?: string;
  error?: string | null;
};

/** Reads the message out of either the success record or the error envelope. */
function readMessage(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const failure = (payload as Record<string, unknown>).error;
  if (typeof failure === "string") return failure;
  if (typeof failure === "object" && failure !== null) {
    const message = (failure as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

/**
 * Sends a test message through the configured channel.
 *
 * The server records the attempt in the same log the daily cycle writes to, so
 * the outcome shows up there as well as in the toast.
 */
export function TestNotificationButton({ disabled = false }: { disabled?: boolean }) {
  const [pending, setPending] = React.useState(false);

  const send = async () => {
    setPending(true);
    try {
      const response = await fetch("/api/notifications/test", { method: "POST" });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        toast.error(readMessage(payload) ?? "The test notification could not be sent.");
        return;
      }

      const data = payload as TestResponse;
      if (data.status === "sent") {
        toast.success(data.message ?? "The test notification was sent.");
        return;
      }

      toast.error(data.error ?? data.message ?? "The channel did not accept the message.");
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="secondary" onClick={send} disabled={pending || disabled}>
      <PaperPlaneTiltIcon size={13} />
      {pending ? "Sending…" : "Send test notification"}
    </Button>
  );
}
