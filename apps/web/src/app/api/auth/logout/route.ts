import { clearSessionCookie } from "@/lib/auth/session";
import { ok, toErrorResponse } from "@/lib/api/response";

export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ signedOut: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
