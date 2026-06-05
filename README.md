# Insurance Policy Reminder

A simple Next.js app for tracking insurance policies and sending reminder emails before premium due dates or policy expiry dates.

## Features

- Add, edit, and delete insurance policies
- Store provider, policy number, type, premium amount, due dates, expiry dates, notes, reminder email, and reminder days
- Reminder options for 30 days before, 7 days before, 1 day before, and on the due date
- One-time, quarterly, or yearly premium reminder cycles
- Dashboard for upcoming reminders and overdue policies
- Daily protected cron endpoint for sending Resend emails
- Supabase schema with duplicate-send protection
- Mobile-friendly utility UI

## Stack

- Next.js and React
- Supabase Postgres
- Resend email
- Vercel Cron, or any daily cron that can call an HTTP endpoint

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project and run [supabase/schema.sql](./supabase/schema.sql) in the Supabase SQL editor.

3. Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
# Optional alias accepted by the app for the project URL:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
RESEND_API_KEY=re_your_key
REMINDER_FROM_EMAIL=Policy Reminders <reminders@yourdomain.com>
CRON_SECRET=replace-with-a-long-random-secret
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Reminder Cron

The reminder job lives at:

```text
GET /api/reminders/run
```

It must be called with either:

```text
Authorization: Bearer your-cron-secret
```

or:

```text
/api/reminders/run?secret=your-cron-secret
```

Every run checks active policies. If today's date equals `target_date - reminder_days`, it sends an email and records the send in `sent_reminders` so the same reminder is not sent twice. For quarterly and yearly policies, premium target dates repeat from the first premium due date.

## Vercel Cron

`vercel.json` runs the job daily at 08:00 UTC:

```json
{
  "crons": [
    {
      "path": "/api/reminders/run",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Set all environment variables in Vercel. When `CRON_SECRET` is configured, Vercel automatically sends it as an `Authorization: Bearer ...` header to cron invocations, which matches the protection in this app.

## GitHub Actions Alternative

Create `.github/workflows/reminders.yml`:

```yaml
name: Daily reminders

on:
  schedule:
    - cron: "0 8 * * *"
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Call reminder endpoint
        run: |
          curl -fsS "$APP_URL/api/reminders/run" \
            -H "Authorization: Bearer $CRON_SECRET"
        env:
          APP_URL: ${{ secrets.APP_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
```

## Email Template

The email template is in [lib/email.ts](./lib/email.ts). It includes:

- Policy name
- Provider
- Due date or expiry date
- Premium amount
- Policy number
- Notes
- Suggested action

## Notes For Production

- Add authentication before supporting multiple users in a public app.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it in the browser.
- Verify a sending domain in Resend for production email delivery.
- The app currently formats premiums as USD; change `moneyLabel` in [lib/dates.ts](./lib/dates.ts) if you want another currency.
