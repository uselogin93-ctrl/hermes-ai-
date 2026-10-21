import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/response";

/** Constant-time string comparison, safe for secrets of differing length. */
function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still do a dummy comparison so the early return doesn't leak timing
    // information through length alone any more than necessary.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Requires a signed-in session, otherwise throws a 401. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new ApiError("UNAUTHORIZED", "You need to sign in to use this endpoint.");
  }
  return session;
}

/**
 * Guards the scheduler endpoint: either a valid user session or the shared
 * secret header used by the GitHub Actions cron job.
 */
export async function requireSessionOrCronSecret(request: Request): Promise<"session" | "cron"> {
  const session = await getSession();
  if (session) return "session";

  const secret = request.headers.get("x-system-secret");
  if (env.systemCronSecret && secret && secretsMatch(secret, env.systemCronSecret)) return "cron";

  if (env.allowUnauthenticatedCron && !env.systemCronSecret) return "cron";

  throw new ApiError("UNAUTHORIZED", "This endpoint requires a session or the system cron secret.");
}
