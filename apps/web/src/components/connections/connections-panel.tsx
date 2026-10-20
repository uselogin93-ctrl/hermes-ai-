"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  GithubLogoIcon,
  GoogleDriveLogoIcon,
  LinkedinLogoIcon,
  PlugIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { Connection, Provider } from "@careerpulse/shared-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type ApiFailure = { error?: { message?: string } };

type HealthResponse = {
  status?: string;
  detail?: string | null;
  last_checked_at?: string | null;
  error?: { message?: string };
};

type Permission = {
  /** The OAuth scope, when the line is about one scope. */
  scope: string | null;
  text: string;
};

type ProviderMeta = {
  label: string;
  icon: React.ComponentType<{
    size?: number;
    weight?: "fill" | "regular";
    className?: string;
  }>;
  role: string;
  /** What the app asks the provider for, in plain words. */
  permissions: Permission[];
};

const PROVIDER_META: Record<Provider, ProviderMeta> = {
  github: {
    label: "GitHub",
    icon: GithubLogoIcon,
    role: "Source of commits, pull requests and repository activity.",
    permissions: [
      { scope: "repo", text: "read only, for commit history, pull requests and repository metadata." },
      { scope: "read:user", text: "your public profile name and avatar." },
      {
        scope: null,
        text: "Nothing that writes. The app cannot push code, open issues or change repository settings.",
      },
    ],
  },
  google_drive: {
    label: "Google Drive",
    icon: GoogleDriveLogoIcon,
    role: "Source of documents and notes you write.",
    permissions: [
      { scope: "drive.file", text: "only the files and folders you pick while granting access." },
      { scope: "openid, profile, email", text: "your name and the address notifications are sent to." },
      { scope: null, text: "Nothing that writes. The app cannot edit, delete, share or move anything." },
    ],
  },
  linkedin: {
    label: "LinkedIn",
    icon: LinkedinLogoIcon,
    role: "Publishing target for the post you approve.",
    permissions: [
      {
        scope: "w_member_social",
        text: "publish a post on your behalf. This is the one scope that can post.",
      },
      { scope: "openid, profile", text: "your name, headline and avatar." },
      {
        scope: null,
        text: "No reading of messages, connections or feed. The app never sees anything else on LinkedIn.",
      },
    ],
  },
};

const PROVIDERS: Provider[] = ["github", "google_drive", "linkedin"];

function formatDate(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/** The status shown on a provider card, derived from its connection rows. */
function providerStatus(connections: Connection[]): {
  label: string;
  tone: "success" | "warning" | "neutral";
} {
  if (connections.some((connection) => connection.status === "active")) {
    return { label: "Connected", tone: "success" };
  }
  if (connections.some((connection) => connection.status === "expired")) {
    return { label: "Token expired, needs re-authentication", tone: "warning" };
  }
  return { label: "Not connected", tone: "neutral" };
}

/**
 * The connections screen.
 *
 * Every card shows what the provider was granted, when it was connected and
 * what the buttons will actually do before they are pressed.
 */
export function ConnectionsPanel({
  connections,
  configured,
  timezone,
  connectedProvider,
  errorMessage,
}: {
  connections: Connection[];
  configured: Record<Provider, boolean>;
  timezone: string;
  connectedProvider: string | null;
  errorMessage: string | null;
}) {
  const router = useRouter();
  const [pendingDisconnect, setPendingDisconnect] = React.useState<Connection | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [banner, setBanner] = React.useState<{ tone: "success" | "danger"; text: string } | null>(
    null,
  );

  // The OAuth callback sends the user back here with a result in the query string.
  React.useEffect(() => {
    if (connectedProvider) {
      const label = PROVIDER_META[connectedProvider as Provider]?.label ?? connectedProvider;
      const text = `${label} is connected. The next scan will pick up its activity.`;
      setBanner({ tone: "success", text });
      toast.success(text);
      return;
    }
    if (errorMessage) {
      const text = `The connection failed: ${errorMessage}`;
      setBanner({ tone: "danger", text });
      toast.error(text);
    }
  }, [connectedProvider, errorMessage]);

  const checkHealth = async (connection: Connection) => {
    setBusyId(connection.id);
    try {
      const response = await fetch(`/api/connections/${connection.id}/health`);
      const data = (await response.json()) as HealthResponse;

      if (!response.ok) {
        toast.error(data.error?.message ?? "The connection could not be checked.");
        return;
      }

      if (data.status === "active") {
        toast.success(`${connection.provider_account_label} answered, the token still works.`);
      } else {
        toast.error(
          data.detail ?? `${connection.provider_account_label} did not accept the stored token.`,
        );
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  };

  const disconnect = async () => {
    if (!pendingDisconnect) return;
    setDisconnecting(true);
    try {
      const response = await fetch(`/api/connections/${pendingDisconnect.id}/disconnect`, {
        method: "POST",
      });
      const data = (await response.json()) as ApiFailure & { message?: string };

      if (!response.ok) {
        toast.error(data.error?.message ?? "The account could not be disconnected.");
        return;
      }

      toast.success(data.message ?? "The account was disconnected.");
      setPendingDisconnect(null);
      router.refresh();
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {banner ? (
        <div
          className={
            banner.tone === "success"
              ? "flex items-start gap-3 rounded-lg border border-border bg-success-subtle px-4 py-3"
              : "flex items-start gap-3 rounded-lg border border-border bg-danger-subtle px-4 py-3"
          }
        >
          {banner.tone === "success" ? (
            <CheckCircleIcon size={15} className="mt-0.5 shrink-0 text-success" aria-hidden />
          ) : (
            <WarningIcon size={15} className="mt-0.5 shrink-0 text-danger" aria-hidden />
          )}
          <p className="flex-1 text-[13px] leading-relaxed text-foreground">{banner.text}</p>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setBanner(null)}
            aria-label="Dismiss"
            className="shrink-0"
          >
            <XIcon size={13} />
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const meta = PROVIDER_META[provider];
          const Icon = meta.icon;
          const providerConnections = connections.filter(
            (connection) => connection.provider === provider && connection.status !== "revoked",
          );
          const status = providerStatus(providerConnections);
          const isConfigured = configured[provider];

          return (
            <Card key={provider}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} weight="fill" className="text-foreground" aria-hidden />
                    <CardTitle>{meta.label}</CardTitle>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <CardDescription>{meta.role}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {providerConnections.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border-strong bg-surface/60 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                    No account is connected for {meta.label} yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {providerConnections.map((connection) => (
                      <li key={connection.id} className="rounded-md border border-border bg-surface-muted/40 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-mono text-[13px] text-foreground">
                            {connection.provider_account_label}
                          </p>
                          <Badge tone={connection.status === "active" ? "success" : "warning"}>
                            {connection.status === "active" ? "Active" : "Token expired"}
                          </Badge>
                        </div>

                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Connected {formatDate(connection.connected_at, timezone)}
                          {connection.last_checked_at
                            ? ` · checked ${formatDate(connection.last_checked_at, timezone)}`
                            : " · never checked"}
                        </p>

                        {connection.scopes.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {connection.scopes.map((scope) => (
                              <Badge key={scope} tone="outline" className="font-mono">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            The provider did not report any granted scope.
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void checkHealth(connection)}
                            disabled={busyId === connection.id}
                          >
                            <ArrowClockwiseIcon size={13} />
                            {busyId === connection.id ? "Checking…" : "Check connection"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDisconnect(connection)}
                          >
                            Disconnect
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <Separator />

                <div className="flex flex-wrap items-center gap-2">
                  {isConfigured ? (
                    <Button asChild variant="primary" size="sm">
                      <a href={`/api/connections/${provider}/start`}>
                        <PlugIcon size={13} />
                        Connect {meta.label}
                      </a>
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled>
                      <PlugIcon size={13} />
                      Connect {meta.label}
                    </Button>
                  )}
                  {!isConfigured ? (
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      No OAuth client id is configured for {meta.label} in this environment, so the
                      connect button stays off. Set the client id and secret, then restart the app.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What each provider is asked for</CardTitle>
          <CardDescription>
            The app requests the smallest scope that works, and every call to a provider happens on
            the server. Tokens are encrypted at rest and never sent to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {PROVIDERS.map((provider) => {
            const meta = PROVIDER_META[provider];
            const Icon = meta.icon;
            return (
              <div key={provider}>
                <div className="flex items-center gap-2">
                  <Icon size={14} weight="fill" className="text-foreground" aria-hidden />
                  <h3 className="text-[13px] font-semibold text-foreground">{meta.label}</h3>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {meta.permissions.map((permission) => (
                    <li
                      key={`${permission.scope ?? "note"}-${permission.text}`}
                      className="text-[13px] leading-relaxed text-muted-foreground"
                    >
                      {permission.scope ? (
                        <>
                          <code className="rounded-sm bg-surface-muted px-1 py-0.5 font-mono text-[12px] text-foreground">
                            {permission.scope}
                          </code>
                          <span className="px-1.5">{permission.text}</span>
                        </>
                      ) : (
                        permission.text
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog
        open={pendingDisconnect !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDisconnect(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect this account?</DialogTitle>
            <DialogDescription>
              {pendingDisconnect
                ? `${pendingDisconnect.provider_account_label} will be revoked at the provider and the stored token will be deleted. Scans stop using this account immediately, and you can connect it again later.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingDisconnect(null)}>
              Keep it connected
            </Button>
            <Button variant="danger" onClick={disconnect} disabled={disconnecting}>
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
