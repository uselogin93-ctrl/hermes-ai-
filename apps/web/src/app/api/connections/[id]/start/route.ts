import { redirect } from "next/navigation";
import { requireSession } from "@/lib/api/guard";
import { providerSchema } from "@careerpulse/shared-types";
import { createOAuthState, getAuthorizationUrl } from "@/lib/connectors/oauth";
import { ApiError, isNextRedirect, toErrorResponse } from "@/lib/api/response";

/**
 * Starts the OAuth flow for a provider.
 *
 * The dynamic segment carries the provider name, for example
 * `/api/connections/github/start`.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id: provider } = await params;
    const parsed = providerSchema.safeParse(provider);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", `Unknown provider: ${provider}`);
    }

    const url = new URL(request.url);
    const state = createOAuthState(parsed.data, url.searchParams.get("label") ?? undefined);

    return redirect(getAuthorizationUrl(parsed.data, state));
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toErrorResponse(error);
  }
}
