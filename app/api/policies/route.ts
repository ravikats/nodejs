import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_REMINDER_DAYS } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { BILLING_FREQUENCIES, POLICY_TYPES, type PolicyInput } from "@/types/policy";

export const dynamic = "force-dynamic";

function cleanPolicyInput(input: Partial<PolicyInput>): PolicyInput {
  const reminderDays = Array.isArray(input.reminder_days)
    ? input.reminder_days.map(Number).filter((day) => [30, 7, 1, 0].includes(day))
    : DEFAULT_REMINDER_DAYS;

  if (!input.policy_name?.trim()) throw new Error("Policy name is required");
  if (!input.provider?.trim()) throw new Error("Provider is required");
  if (!input.user_email?.trim()) throw new Error("Reminder email is required");

  return {
    policy_name: input.policy_name.trim(),
    provider: input.provider.trim(),
    policy_number: input.policy_number?.trim() || null,
    policy_type: POLICY_TYPES.includes(input.policy_type as any) ? input.policy_type! : "Other",
    premium_amount:
      input.premium_amount === null || input.premium_amount === undefined || Number.isNaN(Number(input.premium_amount))
        ? null
        : Number(input.premium_amount),
    premium_due_date: input.premium_due_date || null,
    billing_frequency: BILLING_FREQUENCIES.includes(input.billing_frequency as any) ? input.billing_frequency! : "quarterly",
    expiry_date: input.expiry_date || null,
    notes: input.notes?.trim() || null,
    reminder_days: reminderDays.length ? reminderDays : DEFAULT_REMINDER_DAYS,
    user_email: input.user_email.trim().toLowerCase(),
    is_active: input.is_active ?? true
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("policies").select("*").order("premium_due_date", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ policies: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Unable to load policies") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const input = cleanPolicyInput(await request.json());
    const { data, error } = await supabase.from("policies").insert(input).select("*").single();
    if (error) throw error;
    return NextResponse.json({ policy: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Unable to create policy") }, { status: 400 });
  }
}
