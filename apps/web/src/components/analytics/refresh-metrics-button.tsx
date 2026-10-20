"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type RefreshResponse = {
  message?: string;
  metricsAvailable?: boolean;
  error?: { message?: string };
};

/**
 * Pulls the newest engagement numbers for one published post.
 *
 * LinkedIn only exposes per post analytics to apps with the analytics
 * product, so the server explains that in the message when it cannot reach
 * live numbers.
 */
export function RefreshMetricsButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const refresh = async () => {
    setPending(true);
    try {
      const response = await fetch(`/api/posts/${postId}/refresh-metrics`, { method: "POST" });
      const data = (await response.json()) as RefreshResponse;

      if (!response.ok) {
        toast.error(data.error?.message ?? "The metrics could not be refreshed.");
        return;
      }

      toast.success(data.message ?? "The metrics were refreshed.");
      router.refresh();
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={refresh} disabled={pending}>
      <ArrowClockwiseIcon size={13} />
      {pending ? "Refreshing…" : "Refresh metrics"}
    </Button>
  );
}
