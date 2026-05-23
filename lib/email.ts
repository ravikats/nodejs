import { Resend } from "resend";
import { dateLabel, moneyLabel } from "@/lib/dates";
import type { Policy, ReminderKind } from "@/types/policy";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  return new Resend(apiKey);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function reminderSubject(policy: Policy, kind: ReminderKind, daysBefore: number) {
  const label = kind === "premium_due" ? "premium due" : "policy expiry";
  if (daysBefore === 0) return `${policy.policy_name}: ${label} today`;
  return `${policy.policy_name}: ${label} in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`;
}

export function reminderHtml(policy: Policy, kind: ReminderKind, targetDate: string, daysBefore: number) {
  const label = kind === "premium_due" ? "Premium due date" : "Policy expiry date";
  const timing = daysBefore === 0 ? "today" : `in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`;
  const action =
    kind === "premium_due"
      ? "Review the policy and pay the premium if it is still pending."
      : "Review renewal options or contact your provider before coverage ends.";

  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2933">
      <h1 style="font-size:22px;margin:0 0 16px">Insurance policy reminder</h1>
      <p style="font-size:16px;line-height:1.5">This is a reminder for <strong>${escapeHtml(policy.policy_name)}</strong>. The ${label.toLowerCase()} is ${timing}.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8faf9;border:1px solid #dfe7e2">
        <tr><td style="padding:10px 12px;font-weight:700">Provider</td><td style="padding:10px 12px">${escapeHtml(policy.provider)}</td></tr>
        <tr><td style="padding:10px 12px;font-weight:700">${label}</td><td style="padding:10px 12px">${dateLabel(targetDate)}</td></tr>
        <tr><td style="padding:10px 12px;font-weight:700">Premium amount</td><td style="padding:10px 12px">${moneyLabel(policy.premium_amount)}</td></tr>
        <tr><td style="padding:10px 12px;font-weight:700">Policy number</td><td style="padding:10px 12px">${policy.policy_number ? escapeHtml(policy.policy_number) : "Not set"}</td></tr>
      </table>
      ${policy.notes ? `<p style="font-size:15px;line-height:1.5"><strong>Notes:</strong> ${escapeHtml(policy.notes)}</p>` : ""}
      <p style="font-size:15px;line-height:1.5"><strong>Suggested action:</strong> ${action}</p>
    </div>
  `;
}

export async function sendReminderEmail(args: {
  to: string;
  policy: Policy;
  kind: ReminderKind;
  targetDate: string;
  daysBefore: number;
}) {
  const from = process.env.REMINDER_FROM_EMAIL || "Policy Reminders <onboarding@resend.dev>";
  const resend = getResend();

  return resend.emails.send({
    from,
    to: args.to,
    subject: reminderSubject(args.policy, args.kind, args.daysBefore),
    html: reminderHtml(args.policy, args.kind, args.targetDate, args.daysBefore)
  });
}
