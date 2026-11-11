# Baytak Noor Implementation Audit and Gap Report

Audit date: 2026-11-11

## Executive result

**Status: NOT READY for production or real orders.** The admin frontend remains a fictional `localStorage` demo, the backend route handlers are not wired to a compatible runtime, authorization is ineffective, and the database migrations contain errors that prevent a clean install. The temporary storefront's inline JavaScript currently fails to parse.

**A new order will not reliably appear in the admin, notify staff, or reduce stock correctly.** The checkout UI cannot run as written; even after repairing it, its request field names do not match the API. The database order function is placeholder code, does not correctly calculate/lock stock or prices, and is not connected to the outbox. The notification worker simulates successful delivery without sending messages.

This report supersedes `plan2.md`. Corrections from the previous audit: `vercel.json` now includes TypeScript routes; `media_assets`, `outbox`, and `channels` tables do exist; public storefront route files exist; and the inventory migration has one movement trigger, not two. These corrections do not change the production-readiness verdict.

## Scope and validation

Reviewed the project layout, current `plan.md`, `site_admin/FEATURES.md`, the admin assets, the temporary storefront, all backend route files, and the ten Supabase migrations.

- All admin JavaScript files pass `node --check`.
- Parsing the inline JavaScript in `storefront_temp/index.html` fails with `SyntaxError: Missing } in template expression`.
- `npm run typecheck` and `npm test` from `backend/` both fail because `tsc` and `vitest` are not installed. The package manifest has no TypeScript dependency.
- `psql` is installed, but there is no local Supabase config, environment file, or database connection configured. No migration, deployment, or live end-to-end test was possible.
- Findings below are based on source and migration inspection; no production environment was accessed.

## Critical blockers

| Priority | Finding | Evidence and impact |
|---|---|---|
| Critical | **Runtime and route contract do not match.** The package scripts use Cloudflare Wrangler, while the deployment target is Vercel. Although `vercel.json` now includes `api/**/*.ts`, route handlers expect a Hono context (`c.req`, `c.json`, `c.get`) and there is no Hono app or adapter to create it. Several handlers also use `c.res.headers`; native Vercel handlers receive request/response arguments instead. | `backend/package.json`; `backend/vercel.json`; e.g. `backend/api/health.ts`. The routes cannot be assumed to run in either configured runtime. |
| Critical | **Backend has source-level build blockers.** Admin routes import `setCorsHeaders` from `lib/auth-guard.ts`, which does not export it. Checkout imports `RateLimiter` and then declares another class with that name, imports an unexported `validate_coupon`, and imports `setCorsHeaders` from the wrong module. `api/admin/archive.ts` contains `--` instead of a TypeScript comment. | `backend/api/admin/*.ts`; `backend/api/store/checkout.ts`; `backend/lib/auth-guard.ts`; `backend/lib/supabase-client.ts`; `backend/api/admin/archive.ts`. |
| Critical | **Admin authentication/authorization is not enforced.** `withAuth` is a higher-order wrapper requiring a handler, but routes call it with the context (`await withAuth(c)`) and discard the returned function. `withRole(...)(c)` may return a 403 response, but routes discard that response and continue to service-role database operations. Other routes omit these calls altogether. The auth helper also decodes JWT claims without signature verification and does not check the current staff profile status. | `backend/lib/auth-guard.ts`; e.g. `backend/api/admin/orders.ts`, `products.ts`, `accounting.ts`, and `coupons.ts`. Do not expose these handlers or service-role credentials. |
| Critical | **Admin screens are not connected to the backend.** The admin explicitly documents fictional demo records and `localStorage` persistence. Its scripts contain no API fetch or Supabase Auth integration; sign-out/storefront actions are demo-only. | `site_admin/FEATURES.md`; `site_admin/assets/store.js`; `site_admin/assets/app.js`. Changes made in the admin do not reach Supabase and incoming orders cannot appear in its screens. |
| Critical | **Migrations fail on a fresh database.** Examples include an inventory index on nonexistent `inventory_movements.deleted_at`; order item/payment/event indexes on nonexistent `deleted_at`; invalid partial `UNIQUE` table constraints; malformed indexes missing the table and indexed column; and SQL functions declared `LANGUAGE SQL` with PL/pgSQL bodies. | `supabase/migrations/0003_images_inventory.sql` through `0008_staff_archive_addons.sql`. The files also reference `refresh_smart_collection` and `inventory_overview`, neither of which is defined in the migrations. |
| Critical | **Checkout storefront script and request contract are broken.** The embedded script has a template-literal syntax error, so the page's product/cart/checkout code does not execute. If that is fixed, variant UUIDs are interpolated into inline handlers without quotes; the UI sends `variantIds`/`quantities`, while the API expects `variant_ids`/`quantities`; and it sends `couponCode`, while the API reads `coupon_code`. Its displayed total remains zero. | `storefront_temp/index.html`; `backend/api/store/checkout.ts`. Relative `/api/...` URLs also target the storefront origin when the storefront and API are deployed separately. |
| Critical | **The order transaction is not safe or complete.** `place_order` has invalid SQL/PLpgSQL structure, uses `currval` for a UUID customer ID, leaves `v_total` undeclared, uses placeholder totals, does not compare requested quantities with stock, does not lock rows, and does not reject an invalid/missing variant reliably. It is not idempotent and does not enqueue a new-order notification. | `supabase/migrations/0004_orders_payments.sql`; `backend/api/store/checkout.ts`. The API also computes a coupon using the client-supplied total before calling the database. |
| Critical | **Inventory updates are not safe.** The migration has one trigger that applies a movement delta; the earlier report's claim of two decrement triggers was incorrect. However, the trigger clamps stock at zero rather than rejecting oversell, and the order function's stock checks do not verify requested quantities or safely serialize competing orders. The function's order/item/movement behavior is not a valid atomic checkout. | `supabase/migrations/0003_images_inventory.sql:27-45`; `supabase/migrations/0004_orders_payments.sql`. |
| Critical | **Notifications are not delivered or reliably triggered.** `outbox` and `channels` tables exist, but placing an order does not insert an outbox event. The worker's email and WhatsApp senders return simulated success and mark jobs sent without calling a provider; it does not claim jobs atomically or increment retry attempts. Its `channels:channels(*)` join has no foreign-key relationship. The cron SQL sends `Authorization: Bearer ...`, but the handler checks `X-Cron-Secret`. The low-stock job inserts a `push` job without the required `recipient`, and the worker has no push sender. | `backend/api/cron/process-outbox.ts`; `supabase/migrations/0010_seed_and_cron.sql`. No admin-visible notification or external delivery is dependable. |
| High | **Storefront public APIs conflict with database permissions and runtime.** Public routes use the anon key to read/write base tables, while migration `0003` revokes anon table access and no corresponding safe public views/policies are defined. Several routes use CommonJS `require` despite `"type": "module"`. Public tracking accepts an order ID and selects customer/order data; if permissions are loosened to make it work, this can expose personal information without customer verification. | `backend/api/store/*.ts`; `backend/lib/supabase-client.ts`; migrations `0002`, `0003`, and later table migrations. |

## Order-to-inventory and notification trace

| Stage | Current behavior | Result |
|---|---|---|
| Load products | Storefront calls a relative product endpoint; the API queries base tables with anon credentials and selects fields not matching the schema/security grants. | Catalogue request is not reliable. |
| Add to cart | The storefront script does not parse; even if repaired, variant IDs are emitted as unquoted JavaScript values. | Cart actions do not work as written. |
| Submit checkout | Sends camelCase variant IDs and coupon key; backend expects snake_case. The displayed total is zero and the hidden total is not an authoritative price source. | Request validation/checkout cannot work correctly. |
| Create order | SQL function is invalid and uses hard-coded totals, incomplete stock checks, and placeholder customer/order data. | No dependable order transaction. |
| Decrement inventory | The single trigger applies a movement delta but clamps at zero; transaction logic does not enforce requested quantity or concurrency safety. | Stock may be incorrect or oversold. |
| Enqueue notification | No order/outbox insert is present in `place_order`. | A new order does not create an alert job. |
| Process notification | Worker does not send; it simulates success and can mark unsent jobs as sent. Cron's auth header does not match the worker. | Admin/customer notifications are not delivered. |
| Show order in admin | Admin reads seeded demo data from `localStorage`, with no API integration or polling. | Real order is not displayed. |

## Admin feature coverage

The admin documents 28 working demo destinations. A backend file or table alone does not mean a feature is integrated, authorized, or production-ready.

| Admin destination | Existing backend/database footprint | Audit result |
|---|---|---|
| Dashboard | None | Demo navigation and fictional metrics only; no live dashboard API. |
| Analytics | `analytics_events` table | No usable analytics API/reporting; required `inventory_overview` view is absent. |
| Accounting | `api/admin/accounting.ts`; expense and marketing tables | Partial CRUD; missing reports/courier workflows; auth absent; marketing condition uses a comma operator. |
| AI Assistant | `ai_connections` table | No working connector, API-key secret storage, or AI operation backend. |
| Products | `api/admin/products.ts`; products/variants tables | Partial product CRUD only; no atomic variants/images/categories/collections management; auth is ineffective; schema/API field drift. |
| Inventory | `inventory_movements` table and trigger | No admin inventory-management/adjustment route; oversell and adjustment correctness are not enforced. |
| Suppliers | `api/admin/suppliers.ts`; suppliers table | CRUD scaffold only; no effective auth or integrated supplier/product workflows. |
| Categories | `api/admin/categories.ts`; categories table | CRUD scaffold; public route exists but uses ESM-incompatible `require` and anon table access is revoked. |
| Collections | `api/admin/collections.ts`; collections table | CRUD scaffold; smart-collection RPC is referenced but undefined; public endpoint has the same access/runtime issues. |
| Media Library | `api/admin/media-library.ts`; `media_assets` table | Table exists, correcting the previous report; route does not implement a complete signed-upload/storage workflow. `media_assets.product_id` references `product_images`, not `products`. |
| Orders | `api/admin/orders.ts`; order tables | Broken/incomplete: GET detail is shadowed by list branch; POST fulfillment shadows refund; no correct restock/refund transaction; auth is ineffective. |
| WhatsApp Messages | `api/webhooks/whatsapp.ts`; `channels` table | Webhook is a stub; no message/thread tables or admin API; POST signature is not verified and messages are not persisted. |
| Email Log | `email_log` table | No admin log API or real sender/worker updates; simulated outbox sends are not logged. |
| Coupons | `api/admin/coupons.ts`; coupons table/function | CRUD scaffold; validation function has SQL/PLpgSQL mismatch; auth is absent; checkout does not apply safely. |
| Reviews | `api/admin/reviews.ts`; reviews table; public route | Moderation/submission scaffolds only; anon writes are denied by migrations; photo upload and verification are absent. |
| Waitlist | `api/admin/waitlist.ts`; waitlist table; public route | Public/admin files exist, but migration uses invalid partial unique constraints and a missing `deleted_at` index; no working restock notification. |
| Blog Articles | `api/admin/blog.ts`; `blog_posts` table | CRUD scaffold; malformed slug index prevents migration; no usable public content API. |
| Custom Pages | `api/admin/cms-pages.ts`; `cms_pages` table | CRUD scaffold; malformed slug index prevents migration; no usable public content API. |
| FAQ Manager | `api/admin/faqs.ts`; `faqs` table | CRUD scaffold; malformed status index prevents migration; no usable public content API. |
| URL Redirects | `api/admin/redirects.ts`; redirects table | CRUD scaffold; malformed unique index prevents migration; no public redirect resolution/hit tracking. |
| Newsletter | `api/admin/newsletter.ts`; newsletter table; public route | Routes exist, but migration has an invalid partial unique constraint and no `deleted_at`; anon table access is revoked. |
| Inbound Contact | `api/admin/contact-inquiries.ts`; contact table; public route | Partial; public insert is denied by grants, outbox failure is ignored, and admin route's `auth.users` relationship query is invalid. |
| Store Settings | `api/admin/store-settings.ts`; `store_settings` table | Admin CRUD scaffold with ineffective auth; safe SQL settings function exists, but no public API exposes it. |
| Phone App & Alerts | `api/admin/phone-app.ts`; push subscriptions table | Subscription CRUD only; missing delivery worker; push index references nonexistent `deleted_at`. |
| Add-ons | `api/admin/add-ons.ts`; `addons` table | Partial status/config CRUD; no billing/entitlement implementation; seed data in `0010` also needs validation. |
| Staff & Roles | `api/admin/staff.ts`; `staff_profiles` table | Invite does not create the Supabase Auth user; active status/role checks are not securely enforced. |
| Archive | `api/admin/archive.ts` | References absent `archive_items`/`archive_log`; supports only a subset; restore/purge paths are invalid and file has a syntax error. |
| Admin Profile | `api/admin/profile.ts`; `staff_profiles` table | Profile/session operations are broken or no-op; duplicate GET/PUT/POST branches shadow later actions; password update is not implemented. |

## Additional gaps

1. **Schema/API drift:** routes use fields not present in the migrations, including product `sort_order`/`category`, order/customer relations in unsupported shapes, and archive tables. Several route filters assume `deleted_at` where tables lack that column.
2. **RLS and permissions:** only selected tables have RLS policies; later business tables do not have a coherent role matrix. Most admin routes use a service-role client, which bypasses RLS. Anon access is revoked, but public endpoints still query/insert base tables with anon credentials.
3. **Public endpoints:** catalogue, categories, collections, contact, newsletter, reviews, tracking, and waitlist route files exist, correcting the previous report's route-count statement. They remain unusable or unsafe due runtime, permissions, validation, privacy, and missing-view issues.
4. **Storage and secrets:** storage buckets exist, but API signed upload flows are missing. Settings include secrets-related UI, but there is no Vault-backed API. Payment-proof and review-photo upload/authorization are incomplete.
5. **Operational/deployment readiness:** no TypeScript dependency despite the typecheck script; no installed test runner in this worktree; no test suite/CI or migration verification; Cloudflare scripts conflict with the Vercel target. `plan.md` still says `backend/`, `storefront_temp/`, and `supabase/` do not exist and marks roadmap work incomplete.
6. **Repository layout:** empty top-level directories `backendapiadmin`, `backendapicron`, `backendapistore`, `backendapiwebhooks`, and `backendlib` are outside the documented layout.

## Recommended closure order

1. Select Vercel Node functions or a deliberate Hono adapter; align handler signatures, scripts, imports, environment variables, and CORS.
2. Make TypeScript compile, then repair and apply all migrations against a clean development Supabase project. Add missing functions/views/tables and complete RLS.
3. Implement verified Supabase JWT authentication, current active-staff/role checks, and ensure rejected middleware responses stop handler execution. Avoid service-role access unless a separately authorized operation requires it.
4. Replace checkout with a validated, idempotent database transaction that computes authoritative prices/coupons/shipping, locks stock, rejects insufficient quantities, writes order/items, decrements stock once, and inserts an outbox event.
5. Fix the storefront syntax and cart flow, request contract, API origin, product rendering, and customer/checkout validation.
6. Implement an outbox worker with atomic job claiming, real provider integrations, retries/attempt updates, correct cron authentication, and admin-visible notifications; implement push delivery or remove unsupported push jobs.
7. Integrate the admin screen-by-screen with authenticated APIs and verify each feature against its documented actions, including inventory, orders, refunds/restocks, staff, settings, archive, and reports.
8. Add automated typecheck, unit/API, migration/RLS, and end-to-end tests. The required acceptance case is one order appearing in admin, decrementing stock exactly once, rejecting oversell, remaining idempotent on retry, and creating a deliverable notification.
9. Update `plan.md` to reflect actual verified status; deploy only after the clean-database and end-to-end gates pass.

## Production decision

**Do not deploy the current backend as a public service, connect it to live customer data, or accept real orders.** The repository is a scaffold/demo, not a complete implementation of the roadmap. The order → inventory → notification → admin workflow is not functional or verified.
