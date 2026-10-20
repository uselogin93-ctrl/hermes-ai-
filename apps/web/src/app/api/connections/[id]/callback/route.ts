import { redirect } from "next/navigation";
import { providerSchema } from "@careerpulse/shared-types";
import { getDb } from "@/lib/db";
import { upsertConnection } from "@/lib/services/connections";
import { exchangeCodeForTokens, verifyOAuthState } from "@/lib/connectors/oauth";
import { ApiError, isNextRedirect } from "@/lib/api/response";

/**
 * OAuth callback for every provider.
 *
 * The state parameter is signed and short lived, so the callback cannot be
 * replayed or pointed at another provider.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: provider } = await params;
    const parsed = providerSchema.safeParse(provider);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", `Unknown provider: ${provider}`);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    if (oauthError) {
      throw new ApiError(
        "PROVIDER_ERROR",
        `${parsed.data} refused the connection: ${url.searchParams.get("error_description") ?? oauthError}`,
      );
    }

    if (!code) throw new ApiError("VALIDATION_ERROR", "The provider did not return an authorization code.");

    const verified = verifyOAuthState(state);
    if (!verified || verified.provider !== parsed.data) {
      throw new ApiError("VALIDATION_ERROR", "The connection attempt could not be verified. Start again.");
    }

    const tokens = await exchangeCodeForTokens(parsed.data, code);
    const db = await getDb();
    await upsertConnection(db, {
      provider: parsed.data,
      label: tokens.label,
      providerUserId: tokens.providerUserId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      scopes: tokens.scopes,
      expiresAt: tokens.expiresAt,
    });

    redirect(`/connections?connected=${parsed.data}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : "The connection could not be completed.";
    redirect(`/connections?error=${encodeURIComponent(message)}`);
  }
}
