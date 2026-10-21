import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { appUsers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { LoginBrand, LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const db = await getDb();
  const [existing] = await db.select({ id: appUsers.id }).from(appUsers).limit(1);
  // Nobody has created the single account yet — send them to the one-time
  // setup page instead of a sign-in form they have no credentials for.
  if (!existing) redirect("/setup");

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <LoginBrand />
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <h1 className="text-base font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            This workspace is single-user. Use the account you created for this deployment.
          </p>
          <div className="mt-5">
            <LoginForm defaultEmail="" />
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          Tokens for GitHub, Drive and LinkedIn are encrypted at rest and never reach the browser.
        </p>
      </div>
    </div>
  );
}
