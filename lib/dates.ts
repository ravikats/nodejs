import { addDays, addMonths, addYears, differenceInCalendarDays, format, parseISO, startOfToday, subDays } from "date-fns";
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

export function getPremiumTargetDates(policy: Policy, today = startOfToday(), horizonDays = 45) {
  if (!policy.premium_due_date) return [];

  const firstDueDate = parseISO(policy.premium_due_date);
  if (policy.billing_frequency === "one_time") {
    return [policy.premium_due_date];
  }

  const maxReminderDays = Math.max(...policy.reminder_days, 0);
  const latestUsefulDate = addDays(today, horizonDays + maxReminderDays);
  const dates: string[] = [];
  let current = firstDueDate;
  const cycleMonths = policy.billing_frequency === "yearly" ? 12 : 3;
  const staleWindowDays = cycleMonths === 12 ? 370 : 95;

  while (current < subDays(today, staleWindowDays)) {
    current = cycleMonths === 12 ? addYears(current, 1) : addMonths(current, 3);
  }

  while (current <= latestUsefulDate) {
    dates.push(isoDate(current));
    current = cycleMonths === 12 ? addYears(current, 1) : addMonths(current, 3);
  }

  return dates;
}

export function getPolicyReminderTargets(policy: Policy, today = startOfToday(), horizonDays = 45) {
  const premiumTargets = getPremiumTargetDates(policy, today, horizonDays).map((date) => ({
    kind: "premium_due" as ReminderKind,
    date
  }));
  const expiryTargets = policy.expiry_date ? [{ kind: "policy_expiry" as ReminderKind, date: policy.expiry_date }] : [];

  return [...premiumTargets, ...expiryTargets];
}

export function getUpcomingReminders(policies: Policy[], horizonDays = 45): UpcomingReminder[] {
  const today = startOfToday();
  const horizon = addDays(today, horizonDays);
  const reminders: UpcomingReminder[] = [];

  for (const policy of policies.filter((item) => item.is_active)) {
    const targets = getPolicyReminderTargets(policy, today, horizonDays);

    for (const target of targets) {
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
