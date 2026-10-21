import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { appUsers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { LoginBrand } from "../login/login-form";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SetupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const db = await getDb();
  const [existing] = await db.select({ id: appUsers.id }).from(appUsers).limit(1);
  // This page only exists for the very first run. Once the single account
  // has been created, send everyone to the normal sign-in page instead.
  if (existing) redirect("/login");

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <LoginBrand />
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <h1 className="text-base font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            This workspace is single-user. Set the email and password you&apos;ll use to sign in —
            there&apos;s no one else to create an account after this.
          </p>
          <div className="mt-5">
            <SetupForm />
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          Tokens for GitHub, Drive and LinkedIn are encrypted at rest and never reach the browser.
        </p>
      </div>
    </div>
  );
}
