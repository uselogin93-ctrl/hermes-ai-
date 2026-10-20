"use client";

import * as React from "react";
import { XIcon } from "@phosphor-icons/react";

const STORAGE_KEY = "careerpulse:privacy-notice-dismissed";

/**
 * Privacy notice.
 *
 * The app sets no analytics or tracking cookies; only the session cookie
 * exists. The notice explains that, and can be dismissed permanently.
 *
 * It lives in the page footer rather than floating over the content, so it
 * never covers the dashboard.
 */
export function PrivacyNotice() {
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (dismissed) return null;

  return (
    <p className="mt-1 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
      <span>
        Private by design: this tool runs on your own infrastructure and sets no tracking cookies.
        The only cookie is your sign-in session.
      </span>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(STORAGE_KEY, "1");
          setDismissed(true);
        }}
        aria-label="Dismiss privacy notice"
        className="mt-0.5 shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <XIcon size={11} />
      </button>
    </p>
  );
}
