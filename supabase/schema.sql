create extension if not exists "pgcrypto";

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  policy_name text not null,
  provider text not null,
  policy_number text,
  policy_type text not null default 'Other',
  premium_amount numeric(12, 2),
  premium_due_date date,
  billing_frequency text not null default 'quarterly',
  expiry_date date,
  notes text,
  reminder_days integer[] not null default array[30, 7, 1, 0],
  user_email text not null,
  is_active boolean not null default true,
  constraint policies_policy_type_check check (
    policy_type in ('Health', 'Life', 'Auto', 'Home', 'Travel', 'Business', 'Other')
  ),
  constraint policies_billing_frequency_check check (
    billing_frequency in ('one_time', 'quarterly', 'yearly')
  ),
  constraint policies_reminder_days_check check (
    reminder_days <@ array[30, 7, 1, 0]
  )
);

alter table public.policies
  add column if not exists billing_frequency text not null default 'quarterly';

alter table public.policies
  alter column billing_frequency set default 'quarterly';

alter table public.policies
  drop constraint if exists policies_billing_frequency_check;

alter table public.policies
  add constraint policies_billing_frequency_check
  check (billing_frequency in ('one_time', 'quarterly', 'yearly'));

create table if not exists public.sent_reminders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('premium_due', 'policy_expiry')),
  target_date date not null,
  days_before integer not null check (days_before in (30, 7, 1, 0)),
  sent_to text not null,
  unique (policy_id, reminder_kind, target_date, days_before)
);

create index if not exists policies_active_due_idx
  on public.policies (is_active, premium_due_date, expiry_date);

create index if not exists sent_reminders_policy_idx
  on public.sent_reminders (policy_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists policies_set_updated_at on public.policies;
create trigger policies_set_updated_at
before update on public.policies
for each row execute function public.set_updated_at();

alter table public.policies enable row level security;
alter table public.sent_reminders enable row level security;

-- The app uses the Supabase service role key only from Next.js API routes.
-- Keep client-side anonymous access disabled until you add authentication.
