import { createHmac, timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import { env } from "@/lib/env";
import type { Provider } from "@careerpulse/shared-types";
import { getLinkedInProfile } from "@/lib/connectors/linkedin";

export type OAuthState = {
  provider: Provider;
  issuedAt: number;
  label?: string;
};

const STATE_TTL_MS = 15 * 60 * 1000;

function signState(data: string): string {
  return createHmac("sha256", env.sessionSecret).update(data).digest("base64url");
}

export function createOAuthState(provider: Provider, label?: string): string {
  const payload: OAuthState = { provider, issuedAt: Date.now(), label };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signState(encoded)}`;
}

export function verifyOAuthState(state: string | null): OAuthState | null {
  if (!state) return null;
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;
  const expected = signState(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthState;
    if (Date.now() - payload.issuedAt > STATE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

const GITHUB_SCOPES = "repo read:user";
const GOOGLE_SCOPES =
  env.googleDriveApiKey && env.googleClientId
    ? "https://www.googleapis.com/auth/drive.file openid profile email"
    : "https://www.googleapis.com/auth/drive.file";
const LINKEDIN_SCOPES = "openid profile w_member_social";

export function getAuthorizationUrl(provider: Provider, state: string): string {
  if (provider === "github") {
    const params = new URLSearchParams({
      client_id: env.githubClientId,
      redirect_uri: env.githubOAuthRedirectUri,
      scope: GITHUB_SCOPES,
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  if (provider === "google_drive") {
    const params = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: env.googleOAuthRedirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: env.linkedinClientId,
    redirect_uri: env.linkedinOAuthRedirectUri,
    response_type: "code",
    scope: LINKEDIN_SCOPES,
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  providerUserId: string;
  label: string;
  expiresAt: Date | null;
};

/** Exchanges the authorization code for provider tokens. */
export async function exchangeCodeForTokens(
  provider: Provider,
  code: string,
): Promise<OAuthTokens> {
  if (provider === "github") {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.githubClientId,
        client_secret: env.githubClientSecret,
        code,
        redirect_uri: env.githubOAuthRedirectUri,
      }),
    });
    const data = (await response.json()) as {
      access_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!data.access_token) {
      throw new Error(data.error_description ?? data.error ?? "GitHub did not return a token");
    }
    const profile = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        "User-Agent": "CareerPulse-AI",
        Accept: "application/vnd.github+json",
      },
    });
    const user = (await profile.json()) as { id?: number; login?: string };
    return {
      accessToken: data.access_token,
      refreshToken: null,
      scopes: (data.scope ?? "").split(",").filter(Boolean),
      providerUserId: String(user.id ?? data.access_token.slice(0, 12)),
      label: user.login ? `github-${user.login}` : "github-account",
      expiresAt: null,
    };
  }

  if (provider === "google_drive") {
    const client = new google.auth.OAuth2(
      env.googleClientId,
      env.googleClientSecret,
      env.googleOAuthRedirectUri,
    );
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) throw new Error("Google did not return an access token");
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      scopes: (tokens.scope ?? GOOGLE_SCOPES).split(" ").filter(Boolean),
      providerUserId: profile.data.id ?? profile.data.email ?? "google-account",
      label: profile.data.email ? `drive-${profile.data.email}` : "drive-account",
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    };
  }

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.linkedinOAuthRedirectUri,
      client_id: env.linkedinClientId,
      client_secret: env.linkedinClientSecret,
    }),
  });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "LinkedIn did not return a token");
  }
  const profile = await getLinkedInProfile(data.access_token);
  return {
    accessToken: data.access_token,
    refreshToken: null,
    scopes: (data.scope ?? LINKEDIN_SCOPES).split(" ").filter(Boolean),
    providerUserId: profile.id,
    label: `linkedin-${profile.name.toLowerCase().replace(/\s+/g, "-")}`,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}

/** Revokes the token at the provider so a local delete also kills access. */
export async function revokeToken(provider: Provider, accessToken: string): Promise<void> {
  try {
    if (provider === "github") {
      await fetch(`https://api.github.com/applications/${env.githubClientId}/token`, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${env.githubClientId}:${env.githubClientSecret}`,
          ).toString("base64")}`,
          "User-Agent": "CareerPulse-AI",
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      return;
    }

    if (provider === "google_drive") {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
        method: "POST",
      });
      return;
    }

    const params = new URLSearchParams({
      token: accessToken,
      client_id: env.linkedinClientId,
      client_secret: env.linkedinClientSecret,
    });
    await fetch(`https://www.linkedin.com/oauth/v2/revoke?${params.toString()}`, { method: "POST" });
  } catch (error) {
    console.error("[oauth] revoke failed", provider, error);
  }
}
