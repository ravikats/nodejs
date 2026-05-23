import { addDays, differenceInCalendarDays, format, parseISO, startOfToday, subDays } from "date-fns";
import type { Policy, ReminderKind, UpcomingReminder } from "@/types/policy";

export const DEFAULT_REMINDER_DAYS = [30, 7, 1, 0];

export function isoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function dateLabel(date: string | null) {
  if (!date) return "Not set";
  return format(parseISO(date), "MMM d, yyyy");
}

export function moneyLabel(amount: number | null) {
  if (amount === null || Number.isNaN(amount)) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(amount);
}

export function getReminderDate(targetDate: string, daysBefore: number) {
  return isoDate(subDays(parseISO(targetDate), daysBefore));
}

export function getUpcomingReminders(policies: Policy[], horizonDays = 45): UpcomingReminder[] {
  const today = startOfToday();
  const horizon = addDays(today, horizonDays);
  const reminders: UpcomingReminder[] = [];

  for (const policy of policies.filter((item) => item.is_active)) {
    const targets: Array<{ kind: ReminderKind; date: string | null }> = [
      { kind: "premium_due", date: policy.premium_due_date },
      { kind: "policy_expiry", date: policy.expiry_date }
    ];

    for (const target of targets) {
      if (!target.date) continue;
      const targetDate = parseISO(target.date);
      const targetOverdue = differenceInCalendarDays(targetDate, today) < 0;

      for (const daysBefore of policy.reminder_days) {
        const reminderDateString = getReminderDate(target.date, daysBefore);
        const reminderDate = parseISO(reminderDateString);
        const withinHorizon = reminderDate >= today && reminderDate <= horizon;

        if (withinHorizon || targetOverdue) {
          reminders.push({
            policy,
            kind: target.kind,
            targetDate: target.date,
            reminderDate: reminderDateString,
            daysBefore,
            isToday: differenceInCalendarDays(reminderDate, today) === 0,
            isOverdue: targetOverdue
          });
        }
      }
    }
  }

  return reminders.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return a.reminderDate.localeCompare(b.reminderDate);
  });
}
