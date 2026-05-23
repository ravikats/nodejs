export const POLICY_TYPES = [
  "Health",
  "Life",
  "Auto",
  "Home",
  "Travel",
  "Business",
  "Other"
] as const;

export type PolicyType = (typeof POLICY_TYPES)[number];

export const BILLING_FREQUENCIES = ["one_time", "quarterly", "yearly"] as const;

export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];

export type Policy = {
  id: string;
  created_at: string;
  updated_at: string;
  policy_name: string;
  provider: string;
  policy_number: string | null;
  policy_type: PolicyType;
  premium_amount: number | null;
  premium_due_date: string | null;
  billing_frequency: BillingFrequency;
  expiry_date: string | null;
  notes: string | null;
  reminder_days: number[];
  user_email: string;
  is_active: boolean;
};

export type PolicyInput = Omit<Policy, "id" | "created_at" | "updated_at">;

export type ReminderKind = "premium_due" | "policy_expiry";

export type UpcomingReminder = {
  policy: Policy;
  kind: ReminderKind;
  targetDate: string;
  reminderDate: string;
  daysBefore: number;
  isToday: boolean;
  isOverdue: boolean;
};
