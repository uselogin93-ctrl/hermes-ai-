"use client";

import * as React from "react";
import { KeyboardIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

export const SHORTCUT_EVENTS = {
  approve: "careerpulse:approve",
  reject: "careerpulse:reject",
  navigate: "careerpulse:navigate",
  focusSearch: "careerpulse:focus-search",
} as const;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

/**
 * Global keyboard shortcuts.
 *
 * Pages opt into the actions they support by listening for the custom
 * events dispatched here, so the same key works everywhere it is meaningful.
 */
export function Shortcuts() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case "?":
          event.preventDefault();
          setOpen((value) => !value);
          break;
        case "j":
          window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.navigate, { detail: "next" }));
          break;
        case "k":
          window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.navigate, { detail: "previous" }));
          break;
        case "a":
          window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.approve));
          break;
        case "r":
          window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.reject));
          break;
        case "/":
          event.preventDefault();
          window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.focusSearch));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <KeyboardIcon size={15} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Shortcuts are ignored while you are typing in a field.
            </DialogDescription>
          </DialogHeader>
          <dl className="grid gap-2 text-[13px]">
            {(
              [
                ["?", "Open this panel"],
                ["J / K", "Move to the next or previous item in a list"],
                ["A", "Approve the open draft"],
                ["R", "Reject the open draft"],
                ["/", "Focus the search field"],
              ] as [string, string][]
            ).map(([keys, description]) => (
              <div key={keys} className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{description}</dt>
                <dd className="flex gap-1">
                  {keys.split(" / ").map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}
