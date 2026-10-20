"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copy-to-clipboard control used for drafts, links and identifiers. */
export function CopyButton({
  value,
  label = "Copy",
  variant = "ghost",
  size = "icon-sm",
  className,
}: {
  value: string;
  label?: string;
  variant?: "ghost" | "secondary" | "quiet";
  size?: "icon-sm" | "sm" | "md";
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to the clipboard.");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("The clipboard is not available in this browser.");
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={copy}
      className={className}
      aria-label={label}
      title={label}
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {size !== "icon-sm" ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  );
}
