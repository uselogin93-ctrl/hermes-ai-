import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { appUsers } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { ApiError, ok, toErrorResponse } from "@/lib/api/response";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

/**
 * Signs the single operator in.
 *
 * The account is created from the environment on first use, then stored with
 * a scrypt hash so the password never sits in the database in clear text.
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

    let [user] = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);

    if (!user) {
      if (email !== env.adminEmail) {
        throw new ApiError("UNAUTHORIZED", "Those credentials were not recognised.");
      }
      const [created] = await db
        .insert(appUsers)
        .values({
          email,
          name: env.adminName,
          passwordHash: await hashPassword(password || env.adminPassword),
        })
        .returning();
      user = created;
    }

    const valid = await verifyPassword(password, user!.passwordHash);
    if (!valid) {
      throw new ApiError("UNAUTHORIZED", "Those credentials were not recognised.");
    }

    await setSessionCookie({ email: user!.email, name: user!.name });

    return ok({ user: { email: user!.email, name: user!.name } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
