import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod/v4";
import type { ApiErrorResponse } from "@/types/api";

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  reason: z.enum(["general", "timeline", "agency", "vet", "api", "bug", "other"]),
  message: z.string().min(10).max(2000),
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@petborder.com";
const FROM = "PetBorder Contact <noreply@petborder.com>";

const REASON_LABELS: Record<string, string> = {
  general: "General enquiry",
  timeline: "Timeline question",
  agency: "Agency / white-label",
  vet: "Vet portal",
  api: "API access",
  bug: "Bug report",
  other: "Other",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { success: false, error: "Invalid JSON body", status: 400 },
      { status: 400 }
    );
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiErrorResponse>(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input", status: 400 },
      { status: 400 }
    );
  }

  const { name, email, reason, message } = parsed.data;
  const reasonLabel = REASON_LABELS[reason] ?? reason;

  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="background:#1B4F72;border-radius:12px;padding:24px;margin-bottom:24px">
    <h1 style="color:#ffffff;font-size:18px;margin:0 0 4px">New contact form submission</h1>
    <p style="color:#AED6F1;font-size:13px;margin:0">PetBorder — ${reasonLabel}</p>
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
    <tr>
      <td style="padding:8px 0;color:#6b7280;width:100px;vertical-align:top">Name</td>
      <td style="padding:8px 0;color:#111827;font-weight:500">${name}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#6b7280;vertical-align:top">Email</td>
      <td style="padding:8px 0"><a href="mailto:${email}" style="color:#1B4F72">${email}</a></td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#6b7280;vertical-align:top">Reason</td>
      <td style="padding:8px 0;color:#111827">${reasonLabel}</td>
    </tr>
  </table>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:14px;color:#374151;white-space:pre-wrap;line-height:1.6">
${message}
  </div>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="font-size:11px;color:#9ca3af">Sent via petborder.com/contact</p>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `[PetBorder Contact] ${reasonLabel} — ${name}`,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json<ApiErrorResponse>(
      { success: false, error: "Failed to send message. Please try again.", status: 500 },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
