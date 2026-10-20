import { getSession } from "@/lib/auth/session";
import { ok, toErrorResponse } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await getSession();
    return ok({
      user: session ? { email: session.email, name: session.name } : null,
      authenticated: Boolean(session),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
