"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlayIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type CycleState = "idle" | "scanning" | "drafting" | "notifying" | "done";

const LABELS: Record<CycleState, string> = {
  idle: "Run the cycle now",
  scanning: "Scanning your sources…",
  drafting: "Researching and drafting…",
  notifying: "Sending the notification…",
  done: "Cycle finished",
};

/**
 * Manual trigger for the daily cycle.
 *
 * The button reports which stage is running instead of showing a generic
 * spinner, so it is obvious what the system is doing.
 */
export function RunCycleButton() {
  const router = useRouter();
  const [state, setState] = React.useState<CycleState>("idle");

  const run = async () => {
    setState("scanning");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      setState("drafting");

      const response = await fetch("/api/system/run-daily-cycle", { method: "POST" });
      const data = (await response.json()) as {
        message?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        toast.error(data.error?.message ?? "The cycle could not run.");
        setState("idle");
        return;
      }

      setState("notifying");
      await new Promise((resolve) => window.setTimeout(resolve, 300));

      toast.success(data.message ?? "The daily cycle finished.");
      setState("done");
      router.refresh();
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      toast.error("Could not reach the server.");
      setState("idle");
    }
  };

  return (
    <Button variant="secondary" onClick={run} disabled={state !== "idle"}>
      <PlayIcon size={13} weight="fill" />
      {LABELS[state]}
    </Button>
  );
}
