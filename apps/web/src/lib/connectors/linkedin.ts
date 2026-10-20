import type { Connector, ConnectorContext } from "@/lib/connectors/types";

const API_BASE = "https://api.linkedin.com";
const API_VERSION = "202405";

export type LinkedInProfile = {
  id: string;
  name: string;
  email?: string;
};

/**
 * LinkedIn connector.
 *
 * LinkedIn has no first-party JS SDK, so this is a thin REST wrapper
 * (`docs/13-technology-framework-detail.md`). Publishing requires the
 * "Share on LinkedIn" product, which is subject to LinkedIn review.
 */
export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const response = await fetch(`${API_BASE}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`LinkedIn profile request failed (${response.status})`);
  }
  const data = (await response.json()) as { sub: string; name: string; email?: string };
  return { id: data.sub, name: data.name, email: data.email };
}

export type PublishResult = { id: string; url: string | null };

/** Publishes a text-only post to the member feed. */
export async function publishLinkedInPost(
  ctx: ConnectorContext,
  text: string,
): Promise<PublishResult> {
  const author = `urn:li:person:${ctx.providerUserId}`;
  const response = await fetch(`${API_BASE}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LinkedIn publish failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const id = response.headers.get("x-restli-id") ?? response.headers.get("x-linkedin-id") ?? "";
  const bodyText = await response.text();
  let urn = id;
  if (!urn && bodyText) {
    try {
      const parsed = JSON.parse(bodyText) as { id?: string };
      urn = parsed.id ?? "";
    } catch {
      urn = "";
    }
  }

  return {
    id: urn,
    url: urn ? `https://www.linkedin.com/feed/update/${urn}/` : null,
  };
}

export const linkedinConnector: Connector = {
  provider: "linkedin",

  async fetchActivity() {
    // LinkedIn is a publishing target only; the app never reads the feed.
    return [];
  },

  async healthCheck(ctx: ConnectorContext) {
    try {
      const profile = await getLinkedInProfile(ctx.accessToken);
      return { ok: true, detail: profile.name };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : "Token rejected" };
    }
  },
};
