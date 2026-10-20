import { env } from "@/lib/env";

export type EmailResult = { ok: boolean; detail: string };

/**
 * Sends an email over SMTP when a mail transport is configured.
 *
 * The transport is loaded lazily so the dependency is only required by
 * deployments that actually use the email channel.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<EmailResult> {
  if (!env.smtpUrl || !env.emailFrom) {
    return { ok: false, detail: "Email is not configured (SMTP_URL and EMAIL_FROM missing)." };
  }

  try {
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport(env.smtpUrl);
    await transport.sendMail({ from: env.emailFrom, to, subject, text: body });
    return { ok: true, detail: "Email sent." };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Email request failed" };
  }
}
