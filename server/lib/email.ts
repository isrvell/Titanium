// ─── Email provider: Brevo HTTP API (free tier: 300 emails/day) ───
// No SDK needed — plain fetch. If BREVO_API_KEY is missing, emails are
// logged to the console instead (dev/CI fallback, never crashes).

import "dotenv/config";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export type MailInput = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
};

function mailFrom(): { name: string; email: string } {
  return {
    name: process.env.MAIL_FROM_NAME ?? "Gr8r Studio",
    email: process.env.MAIL_FROM_EMAIL ?? "",
  };
}

/**
 * Send one email via Brevo.
 * Returns "sent" | "skipped" (no API key configured) | "failed".
 * Never throws — email delivery must not block API responses.
 */
export async function sendEmail({ to, toName, subject, html, text }: MailInput): Promise<"sent" | "skipped" | "failed"> {
  const sender = mailFrom();
  if (!process.env.BREVO_API_KEY) {
    console.log(
      `[email:dev] skipped Brevo send (no BREVO_API_KEY)\n` +
        `  To:      ${to}\n  Subject: ${subject}\n` +
        `  From:    ${sender.name} <${sender.email || "unset"}>\n` +
        text.split("\n").map((line) => `  | ${line}`).join("\n"),
    );
    return "skipped";
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to, ...(toName ? { name: toName } : {}) }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email:brevo] ${res.status} ${body.slice(0, 300)}`);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[email:brevo] network error:", err instanceof Error ? err.message : err);
    return "failed";
  }
}

// ─── Templates ─────────────────────────────────────────

export type InvitationEmailInput = {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  signupUrl: string;
};

/** Button style shared by templates. */
function cta(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;padding:12px 24px;background:#1e293b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a>`;
}

/** Plain-text version (accessibility + fallback). */
function toText({ inviterName, workspaceName, role, signupUrl }: Omit<InvitationEmailInput, "to">): string {
  return [
    `${inviterName} invited you to join "${workspaceName}" as ${role.toLowerCase()} on Gr8r Studio.`,
    "",
    `Create an account or sign in with your invited email address and the workspace will be added automatically:`,
    signupUrl,
    "",
    "— Gr8r Studio",
  ].join("\n");
}

export async function sendInvitationEmail({ to, inviterName, workspaceName, role, signupUrl }: InvitationEmailInput): Promise<"sent" | "skipped" | "failed"> {
  const subject = `${inviterName} invited you to ${workspaceName} on Gr8r Studio`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="padding:24px 32px;border-bottom:1px solid #f1f5f9;">
      <span style="font-weight:700;font-size:18px;color:#0f172a;">Gr8r&nbsp;Studio</span>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Hi there 👋</h1>
      <p style="margin:0 0 20px;color:#334155;line-height:1.6;">
        <strong>${inviterName}</strong> invited you to join
        <strong>${workspaceName}</strong> as <strong>${role.toLowerCase()}</strong>.
      </p>
      <p style="margin:0 0 24px;color:#64748b;line-height:1.6;font-size:14px;">
        Create an account (or sign in) with the email address this invitation was sent to
        (<strong>${to}</strong>) and the workspace will be added to your account automatically.
      </p>
      ${cta(signupUrl, "Accept the invitation")}
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
        If the button doesn't work, copy this link into your browser:<br />
        <a href="${signupUrl}" style="color:#2563eb;word-break:break-all;">${signupUrl}</a>
      </p>
    </div>
    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">You are receiving this email because someone invited you to a workspace on Gr8r Studio. If it wasn't you, you can safely ignore it.</p>
    </div>
  </div>
</body></html>`;
  return sendEmail({
    to,
    subject,
    html,
    text: toText({ inviterName, workspaceName, role, signupUrl }),
  });
}
