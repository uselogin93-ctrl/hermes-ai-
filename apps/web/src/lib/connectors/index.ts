import type { Provider } from "@careerpulse/shared-types";
import type { Connector } from "@/lib/connectors/types";
import { githubConnector } from "@/lib/connectors/github";
import { googleDriveConnector } from "@/lib/connectors/google-drive";
import { linkedinConnector } from "@/lib/connectors/linkedin";

export const connectors: Record<Provider, Connector> = {
  github: githubConnector,
  google_drive: googleDriveConnector,
  linkedin: linkedinConnector,
};

export function getConnector(provider: Provider): Connector {
  return connectors[provider];
}

export * from "@/lib/connectors/types";
