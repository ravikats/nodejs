import { NextResponse } from "next/server";
import { isoDate, getReminderDate } from "@/lib/dates";
import { sendReminderEmail } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Policy, ReminderKind } from "@/types/policy";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}` || new URL(request.url).searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const today = isoDate(new Date());
  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ policyId: string; reason: string }> = [];

  const { data: policies, error } = await supabase.from("policies").select("*").eq("is_active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const policy of (policies ?? []) as Policy[]) {
    const targets: Array<{ kind: ReminderKind; date: string | null }> = [
      { kind: "premium_due", date: policy.premium_due_date },
      { kind: "policy_expiry", date: policy.expiry_date }
    ];

    for (const target of targets) {
      if (!target.date) continue;

      for (const daysBefore of policy.reminder_days) {
        if (getReminderDate(target.date, daysBefore) !== today) continue;

        const dedupeKey = {
          policy_id: policy.id,
          reminder_kind: target.kind,
          target_date: target.date,
          days_before: daysBefore
        };

        const { data: existing, error: lookupError } = await supabase
          .from("sent_reminders")
          .select("id")
          .match(dedupeKey)
          .maybeSingle();

        if (lookupError) {
          failed.push({ policyId: policy.id, reason: lookupError.message });
          continue;
        }

        if (existing) {
          skipped.push(`${policy.id}:${target.kind}:${target.date}:${daysBefore}`);
          continue;
        }

        try {
          await sendReminderEmail({
            to: policy.user_email,
            policy,
            kind: target.kind,
            targetDate: target.date,
            daysBefore
          });

          const { error: insertError } = await supabase.from("sent_reminders").insert({
            ...dedupeKey,
            sent_to: policy.user_email
          });
          if (insertError) throw insertError;

          sent.push(`${policy.id}:${target.kind}:${target.date}:${daysBefore}`);
        } catch (sendError) {
          failed.push({
            policyId: policy.id,
            reason: sendError instanceof Error ? sendError.message : "Email failed"
          });
        }
      }
    }
  }

  return NextResponse.json({ today, sent, skipped, failed });
}
