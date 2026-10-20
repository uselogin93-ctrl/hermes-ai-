import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { LoginBrand, LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <LoginBrand />
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <h1 className="text-base font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            This workspace is single-user. Use the admin credentials configured for this
            deployment.
          </p>
          <div className="mt-5">
            <LoginForm defaultEmail={env.adminEmail} />
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          Tokens for GitHub, Drive and LinkedIn are encrypted at rest and never reach the browser.
        </p>
      </div>
    </div>
  );
}
