import { Resend } from "resend";
import type { TimelineStep } from "@/types/timeline";

const FROM = "PetBorder <reminders@petborder.com>";

interface ReminderEmailPayload {
  to: string;
  petName: string; // breed used as pet name
  upcomingSteps: TimelineStep[];
  timelineId: string;
}

/** Send a deadline reminder email for steps due within 14 days */
export async function sendDeadlineReminder({
  to,
  petName,
  upcomingSteps,
  timelineId,
}: ReminderEmailPayload): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  if (upcomingSteps.length === 0) return;

  const stepList = upcomingSteps
    .map(
      (s) =>
        `<li style="margin-bottom:8px"><strong>${s.title}</strong> — due ${new Date(s.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</li>`
    )
    .join("");

  const dashboardUrl = `https://petborder.com/dashboard/timelines/${timelineId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="background:#1B4F72;border-radius:12px;padding:24px;margin-bottom:24px">
    <h1 style="color:#ffffff;font-size:20px;margin:0 0 4px">PetBorder Deadline Reminder</h1>
    <p style="color:#AED6F1;font-size:13px;margin:0">Upcoming DAFF compliance steps for <strong>${petName}</strong></p>
  </div>

  <p style="font-size:14px;color:#374151">
    You have <strong>${upcomingSteps.length} step${upcomingSteps.length > 1 ? "s" : ""}</strong> due in the next 14 days:
  </p>

  <ul style="font-size:14px;color:#374151;padding-left:20px">
    ${stepList}
  </ul>

  <a href="${dashboardUrl}"
     style="display:inline-block;background:#E67E22;color:#ffffff;font-weight:bold;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin-top:16px">
    View my timeline →
  </a>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
  <p style="font-size:11px;color:#9ca3af">
    PetBorder provides general guidance only. Always verify requirements with
    <a href="https://www.agriculture.gov.au/biosecurity-trade/cats-dogs" style="color:#1B4F72">DAFF</a>
    before travelling.
  </p>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `🐾 ${upcomingSteps.length} DAFF deadline${upcomingSteps.length > 1 ? "s" : ""} coming up for ${petName}`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
