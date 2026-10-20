import type { ActivityEventType, Provider } from "@careerpulse/shared-types";

/** Decrypted credentials for one connected account. */
export type ConnectorContext = {
  connectionId: string;
  provider: Provider;
  label: string;
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  providerUserId: string;
};

/** Provider-agnostic activity payload produced by every connector. */
export type RawActivity = {
  externalId: string;
  eventType: ActivityEventType;
  title: string;
  detail: Record<string, unknown>;
  url: string;
  occurredAt: Date;
};

export type ConnectorHealth = {
  ok: boolean;
  detail?: string;
};

export type Connector = {
  provider: Provider;
  /** Fetches every activity event that happened at or after `since`. */
  fetchActivity(ctx: ConnectorContext, since: Date): Promise<RawActivity[]>;
  /** Verifies the token is still usable. */
  healthCheck(ctx: ConnectorContext): Promise<ConnectorHealth>;
};
