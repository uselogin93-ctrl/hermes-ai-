import { z } from "zod";
import { getDb } from "@/lib/db";
import { appUsers } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { ApiError, ok, parseBody, toErrorResponse } from "@/lib/api/response";

const setupSchema = z.object({
  email: z.email("Enter a valid email address."),
  name: z.string().trim().min(1, "Enter your name.").max(120),
  password: z.string().min(8, "Use at least 8 characters."),
});

/**
 * One-time first-run setup.
 *
 * This app is single-user (docs/03-auth-integrations.md): there is exactly
 * one account. This endpoint creates it, but only while `app_users` is
 * still empty — once an account exists it always 409s, so it can never be
 * used to create a second account or reset the existing one. After the
 * account exists, sign-in is handled by /api/auth/login instead.
 */
export async function POST(request: Request) {
  try {
    const body = await parseBody(request, setupSchema);
    const db = await getDb();

    const [existing] = await db.select({ id: appUsers.id }).from(appUsers).limit(1);
    if (existing) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "An account already exists for this deployment. Sign in instead.",
      );
    }

    const [user] = await db
      .insert(appUsers)
      .values({
        email: body.email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
      })
      .returning();

    await setSessionCookie({ email: user!.email, name: user!.name });

    return ok({ user: { email: user!.email, name: user!.name } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Tells the login page whether to redirect to setup instead. */
export async function GET() {
  try {
    const db = await getDb();
    const [existing] = await db.select({ id: appUsers.id }).from(appUsers).limit(1);
    return ok({ needsSetup: !existing });
  } catch (error) {
    return toErrorResponse(error);
  }
}
