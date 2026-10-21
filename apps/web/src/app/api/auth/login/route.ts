import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { appUsers } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { ApiError, ok, toErrorResponse } from "@/lib/api/response";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

/**
 * Signs the single operator in.
 *
 * This app is single-user: the one account is created once, via
 * /api/auth/setup (first run only — see that route for why account
 * creation doesn't happen here). This endpoint only ever verifies an
 * existing account; it never creates one, so a login attempt can't be used
 * to provision or take over the admin account.
 */
export async function POST(request: Request) {
  try {
    const body = loginSchema.safeParse(await request.json());
    if (!body.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        body.error.issues.map((issue) => issue.message).join("; "),
      );
    }

    const { email, password } = body.data;
    const db = await getDb();

    const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);

    if (!user) {
      throw new ApiError("UNAUTHORIZED", "Those credentials were not recognised.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new ApiError("UNAUTHORIZED", "Those credentials were not recognised.");
    }

    await setSessionCookie({ email: user.email, name: user.name });

    return ok({ user: { email: user.email, name: user.name } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
