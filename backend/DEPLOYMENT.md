# Backend deployment and verification

This repository targets **Vercel Node.js functions + Supabase Postgres/Auth/Storage**.
The API is not a Cloudflare Worker and Supabase Edge Functions are not used. Do not
deploy it until the prerequisites below have been verified in the target accounts.

## Current release blockers

- No hosted Vercel/Supabase project or migration history was available for verification.
- Historical migrations `0001`–`0010` were corrected for clean installs. Their applied
  state in any shared/hosted project is unknown. Do not reset a hosted database or
  blindly apply the edited history.
- The 28 `site_admin/` screens remain localStorage demo screens. The persistent
  “DEMO MODE” notice is intentional; this admin is not a production operations UI.
- Checkout supports cash on delivery and bank transfer only; no shipping address is
  collected or persisted, and no card-payment provider is integrated.
- Email/WhatsApp credentials and a real delivery test are not available here.

## Local checks

From `backend/`:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

`npm run dev` starts the Vercel development runtime. See the SQL integration test at
`supabase/tests/checkout_atomicity.sql`; run it only against a disposable local
Supabase/Postgres database after applying migrations. Do not point test/reset
commands at a hosted database.

## Vercel configuration

1. Create/select the intended Vercel project and set **Root Directory** to `backend/`.
2. Keep the Node.js runtime. `backend/vercel.json` routes `/api/*` to the dispatcher;
   no Worker compatibility mode is required.
3. Configure the following environment variables for the target environment:

   | Variable | Purpose |
   | --- | --- |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_ANON_KEY` | JWT verification and user-scoped staff lookup |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only database operations; never expose to browser code |
   | `CORS_ALLOWED_ORIGINS` | Comma-separated exact storefront/admin origins |
   | `CRON_SHARED_SECRET` | Bearer token or `X-Cron-Secret` for the outbox worker |
   | `PUBLIC_CHECKOUT_ENABLED` | Must be `true` to accept orders; defaults closed |
   | `TURNSTILE_SECRET_KEY` | Required in production; validates checkout challenge server-side |
   | `RESEND_API_KEY`, `EMAIL_FROM` | Optional email delivery; jobs fail/retry if absent |
   | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | Optional WhatsApp delivery |
   | `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET` | WhatsApp webhook verification/signature |

   Keep secrets in Vercel environment configuration only. `backend/.env.example` uses
   placeholders, not credentials.
4. Configure `storefront_temp/js/config.js` with the deployed API base URL (origin,
   without `/api`) and the public Turnstile site key. Add the storefront origin exactly
   to `CORS_ALLOWED_ORIGINS`. Never put a service-role key or Turnstile secret in the
   static storefront.
5. In production, leave checkout disabled until the database, CORS, Turnstile widget
   and secret, and provider policies have been verified. In-memory request limiting
   is best-effort per function instance, not a distributed limiter.

The outbox cron endpoint accepts POST only and requires `CRON_SHARED_SECRET`. Ensure
the configured Supabase scheduled job sends that same secret. The worker marks an
item sent only after the provider reports success; missing/failed provider config is
recorded as a retry/failure, not a delivery.

## Database migration safety

For a **new disposable development database**, apply migrations `0001` through `0012`
in order and run the SQL integration test. Confirm the schema and test results before
using that database for storefront testing.

For an **existing database**, first inspect the Supabase migration history and current
schema, take a verified backup, and review the exact planned SQL diff. Versions
`0001`–`0010` in this checkout have been edited for clean-install correctness; those
edits do not migrate or repair an already-applied database. Do not run `db reset` on
shared/hosted data, do not mark migrations applied to silence a mismatch, and do not
assume `0011` is compatible until its preconditions have been checked. Create a new
forward-only remediation migration if the hosted schema diverges.

## Required hosted verification before launch

- Verify all migrations and RLS policies against a non-production Supabase project,
  including denied anon access and role-specific staff access.
- Verify inactive/unauthorized staff is rejected before any service-role route query.
- Exercise the checkout path using a test product: one order, order item, inventory
  movement, outbox event; retry the same idempotency key; and confirm oversell rolls
  back without partial writes.
- Verify Vercel rewrites, health endpoint, exact CORS origins, and production secrets.
- Verify a real Resend and/or WhatsApp provider success and failure path.
- Set `store_settings.notifications.adminEmail` to the order-notification recipient and verify
  the transactional admin alert is delivered by the outbox worker.
- Replace or explicitly scope the demo-only admin before treating the full store as
  operational; only catalog, order, inventory, and settings flows backed by the API
  may be described as integrated once implemented and tested.

To configure the admin email alert after applying migration `0012`, set the recipient
in Supabase SQL Editor (replace the example address):

```sql
update public.store_settings
set notifications = jsonb_set(
  coalesce(notifications, '{}'::jsonb),
  '{adminEmail}',
  to_jsonb('orders@example.com'::text),
  true
)
where id = 1;
```

Do not enable public checkout for real customers until the admin is API-backed and
shipping-address capture, order fulfillment, and the intended payment options are
implemented and tested.
