# Baytak Noor Implementation Audit and Gap Report

Audit date: 2026-11-11

## Executive result

**Status: NOT READY for production or real orders.** The repository contains initial backend, storefront, and migration files, but the implementation is not connected end to end. The admin still uses fictional `localStorage` data; the deployed API contract is inconsistent; several database migrations contain blocking SQL errors; and checkout does not validate or decrement inventory correctly.

**A new order will not reliably notify the admin or decrease inventory.** The storefront submits empty variant and quantity arrays, the checkout function has placeholder logic and no stock movement, the inventory triggers would apply a movement twice, and the outbox worker is incomplete. Do not accept real orders or expose the current service-role API publicly.

## Scope and validation

Reviewed the repository tree, `plan.md`, `site_admin/FEATURES.md`, the admin and temporary storefront code, all backend route files, and all ten SQL migrations. Checked the admin JavaScript with `node --check`; all existing admin `.js` files passed syntax checking.

Validation could not establish that the API or migrations run:

- Running npm commands at the repository root fails because there is no root `package.json`.
- In `backend/`, `npm run typecheck` and `npm test` fail because `tsc` and `vitest` are not installed. `typescript` is also absent from `backend/package.json`, and no test files were found.
- No local Supabase/Vercel configuration or project credentials were found to perform a deployment or live database test.
- The source and SQL issues below are therefore reported from direct code inspection, not from a deployed-system test.

## Critical blockers

| Priority | Finding | Evidence and impact |
|---|---|---|
| Critical | **Backend runtime/deployment mismatch.** The package scripts use Cloudflare Wrangler, while the plan targets Vercel. Every API file exports a handler expecting a Hono-style context (`c.req`, `c.json`, `c.get`), but there is no Hono app or Vercel adapter that creates that context. `vercel.json` configures `api/**/*.js`, while the routes are `.ts`. | `backend/package.json:4-7`; `backend/vercel.json:1-8`; e.g. `backend/api/health.ts:3-18`. The handlers cannot be assumed to run as native Vercel functions. |
| Critical | **Admin API authorization is not wired.** Admin routes instantiate the service-role client. `withAuth` and `withRole` are imported but not applied to handlers; the staff payload used by inline checks is never set. The current auth helper does not verify a token signature, parses the entire token as base64 JSON, and does not check the staff profile's active status. | `backend/lib/auth-guard.ts:7-70`; `backend/api/admin/orders.ts:1-15`; `backend/api/admin/products.ts:1-18`. If the runtime is adapted without fixing this, private data is exposed and elevated operations lack reliable authorization. |
| Critical | **Database migrations are not currently runnable as a set.** Migration `0003` creates an index using `deleted_at` on `inventory_movements`, which has no such column. Later migrations contain partial `UNIQUE` table constraints (unsupported syntax), indexes missing their table/column list, and indexes filtering on missing `deleted_at` columns. | `supabase/migrations/0003_images_inventory.sql:17-25`; `0004_orders_payments.sql:46-73`; `0006_reviews_blog.sql:21-32, 52-96`; `0007_newsletter_contact.sql:4-40`; `0008_staff_archive_addons.sql:12-39, 57`. Apply and repair migrations in a clean dev database before any API testing. |
| Critical | **Checkout is placeholder code, not a safe order transaction.** The SQL function is declared `LANGUAGE SQL` but contains a PL/pgSQL `DECLARE/BEGIN` block. It uses `currval` for a UUID customer key, hard-codes placeholder order totals/items, ignores submitted quantities, and has a TODO for stock and coupon validation. | `supabase/migrations/0004_orders_payments.sql:78-151`. Even after syntax fixes, it does not implement the stated pricing, coupon, stock, or idempotency guarantees. |
| Critical | **Inventory is not decremented safely.** `place_order` does not insert into `inventory_movements`. If a movement is inserted, both `stock_increment_trigger` and `stock_decrement_trigger` run on every insert and both add the same delta, doubling the change. Clamping at zero also hides attempted oversells instead of rejecting an order. | `supabase/migrations/0003_images_inventory.sql:27-57`; `supabase/migrations/0004_orders_payments.sql:115-138`. |
| Critical | **Order notifications are not implemented.** There is no `outbox` table in the migrations. The cron route references both `outbox` and `channels`, does not import the referenced `createClient`, and its email/WhatsApp functions are comments/stubs that do not send or update job status. The WhatsApp webhook does not verify request signatures or persist messages. | `backend/api/cron/process-outbox.ts:1-55`; `backend/api/webhooks/whatsapp.ts:1-42`; `supabase/migrations/0010_seed_and_cron.sql:42-70`. No email/WhatsApp/admin notification can be relied on. |
| Critical | **Admin UI is not connected to the backend.** The app initializes the demo store from `localStorage`; no admin asset calls `fetch` or Supabase Auth. Sign-out and storefront actions explicitly show demo toasts. | `site_admin/assets/store.js:7-70`; `site_admin/assets/app.js` (sign-out/store actions); `site_admin/index.html` loads only the existing demo scripts. Admin edits do not persist to Supabase. |
| High | **The temporary storefront cannot place a meaningful order.** Its cart stores `variantId`, but checkout sends `variantIds: []` and `quantities: []`; it does not fetch or submit cart lines. It sends `couponCode`, while the API reads `coupon_code`, and sends client-supplied total. It has no Turnstile token or idempotency key. | `storefront_temp/index.html:122-126, 138-166`; `backend/api/store/checkout.ts:13-35, 56-65`. Since the storefront is a separate Vercel project, its relative `/api/...` URLs also point to the storefront origin, not the backend project. |
| High | **Public catalogue API cannot match the database security model.** It uses the anon key to query the base `products` table, but migrations revoke anon table access and do not create the planned `storefront_products` view. The query also selects nested variants and sorts by `products.sort_order`, which is not present in the schema. `createClient` is not imported in this route. | `backend/api/store/products.ts:1-24`; `supabase/migrations/0002_catalog.sql:130-178`; `supabase/migrations/0003_images_inventory.sql:102-112`. |

## Order-to-inventory and notification trace

| Step | Current implementation | Result |
|---|---|---|
| Storefront collects items | Product cards add a variant to `localStorage`; checkout later submits empty item arrays. | Cart contents are lost at checkout. |
| Storefront calls API | Uses relative `/api/store/checkout`, sends `couponCode`, and trusts an empty hidden total. | Wrong origin when separately deployed; request shape does not match the backend. |
| API validates request | No schema/body validation or Turnstile check; coupon validation uses the client-provided total. The imported `validate_coupon` symbol is not exported by `supabase-client.ts`. | Request cannot be trusted; TypeScript build is expected to fail. |
| Database creates order | Function has invalid language/body syntax and placeholder totals/items; it does not use requested quantities. | Order placement is not operational or correct. |
| Database changes inventory | No movement is inserted; two triggers would apply any movement twice. | Stock is not reliably decremented; oversell protection is absent. |
| Worker sends notification | Outbox/channel tables and send/update implementations are missing. | No reliable email or WhatsApp notification. |
| Admin displays new order | Admin remains on local demo data and has no API polling/notification path. | The order will not appear in the admin panel. |

## Admin feature coverage

The admin has 28 navigable demo destinations documented in `site_admin/FEATURES.md`. Existing backend files do not mean a feature is integrated or production-ready.

| Admin destination | Backend coverage in repository | Audit result |
|---|---|---|
| Dashboard | None required for navigation shell | Demo-only; no live metrics. |
| Analytics | `analytics_events` table only; no admin analytics route or report functions | Missing. |
| Accounting | `api/admin/accounting.ts` handles partial expense/marketing CRUD | Partial and currently unusable: the marketing branch uses a comma operator in its method condition, no P&L/report/courier-settlement APIs, and no auth. |
| AI Assistant | `ai_connections` table only | No API, secret management, or connector implementation. |
| Products | `api/admin/products.ts` | Partial CRUD; no variant/image/category/collection transaction; endpoint has no active auth and schema fields differ. |
| Inventory | No admin inventory route | Missing. |
| Suppliers | `api/admin/suppliers.ts` | CRUD scaffold only; no auth and no integration with product writes. |
| Categories | `api/admin/categories.ts` | CRUD scaffold only; no auth or public category endpoint. |
| Collections | `api/admin/collections.ts` | CRUD scaffold only; no product relation endpoint or `refresh_smart_collection` SQL function. |
| Media Library | `api/admin/media-library.ts` uses `media_assets` | Table is absent from migrations; signed upload/storage operations are not implemented. |
| Orders | `api/admin/orders.ts` | Broken/incomplete: GET detail is shadowed by list branch; POST actions are shadowed; wrong/ambiguous status fields; refund/restock TODOs; no auth. |
| WhatsApp Messages | WhatsApp webhook only | No thread/message tables or admin route; webhook is a stub without signature verification. |
| Email Log | `email_log` table only | No admin route or sender/worker implementation. |
| Coupons | `api/admin/coupons.ts`, coupon table/function | Partial; migration syntax issues and checkout does not safely apply the coupon. |
| Reviews | `api/admin/reviews.ts`, reviews table | Partial moderation; no public review submission API or implemented photo upload. |
| Waitlist | `api/admin/waitlist.ts`, waitlist table | Admin route only; public signup/back-in-stock path missing; migration has invalid uniqueness and index definitions. |
| Blog Articles | `api/admin/blog.ts`, `blog_posts` table | CRUD scaffold; migration index is malformed; no public content endpoint. |
| Custom Pages | `api/admin/cms-pages.ts`, `cms_pages` table | CRUD scaffold; migration index is malformed; no public content endpoint. |
| FAQ Manager | `api/admin/faqs.ts`, `faqs` table | CRUD scaffold; migration index is malformed; no public content endpoint. |
| URL Redirects | `api/admin/redirects.ts`, `redirects` table | Admin scaffold only; no public redirect endpoint/hit tracking; migration index is malformed. |
| Newsletter | `api/admin/newsletter.ts`, newsletter table | Admin scaffold only; public subscribe endpoint absent; migration constraint is invalid. |
| Inbound Contact | `api/admin/contact-inquiries.ts`, contact table | Admin scaffold only; public contact submission endpoint absent; route also queries `auth.users` as a table relation. |
| Store Settings | `api/admin/store-settings.ts`, `store_settings` table | Read/write scaffold; no auth, no safe public settings route, and secrets are not implemented through Vault. |
| Phone App & Alerts | `api/admin/phone-app.ts`, push-subscriptions table | Incomplete; push delivery is explicitly TODO and public/admin notification flow is absent. |
| Add-ons | `api/admin/add-ons.ts`, `addons` table | Partial status CRUD; no billing and no active authentication. |
| Staff & Roles | `api/admin/staff.ts`, `staff_profiles` table | Invite does not create a Supabase Auth user; role/status enforcement is incomplete; auth route is unprotected. |
| Archive | `api/admin/archive.ts` | Incomplete; `archive_items` and `archive_log` are absent; only a subset of types is listed; restore/purge paths are not valid end-to-end. |
| Admin Profile | `api/admin/profile.ts`, `staff_profiles` table | Incomplete; password update references undefined `userId` and a non-existent auth method; session operations are TODO. |

## Additional implementation gaps

1. **Schema/API contract drift:** route code expects columns/tables not in migrations, including `media_assets`, `archive_items`, `archive_log`, `outbox`, and `channels`. Product code expects `sort_order`; order code queries `created_at` and uses order/customer fields inconsistently. Several later routes target partially defined tables.
2. **RLS is incomplete:** only selected early tables have policies. Later-created orders, contacts, newsletter, accounting, analytics, and other tables do not receive a complete role matrix. Most API handlers use the service-role client, which bypasses RLS.
3. **Route coverage is incomplete:** public storefront business routes exist only for products and checkout (apart from health/webhook endpoints). There is no working route for store settings, product detail/category/collection, tracking, newsletter, contact, waitlist, reviews, redirects, or events.
4. **Missing backend operations:** no inventory adjustment route, no courier-sync route, no Vault secrets route, no functional media-upload route, no analytics reports, and no usable session/login implementation.
5. **Unsafe/unreliable database behaviors:** several tables do not define the soft-delete columns used by indexes or API filters; SQL policies and route role checks do not consistently match the documented role matrix.
6. **Build/test setup is incomplete:** `backend/package.json` has no TypeScript dependency despite a `tsc` script, no root workspace scripts, no test files, and no successful CI/build evidence. `createClient` is also used without an import in `api/store/products.ts` and `api/cron/process-outbox.ts`; `api/admin/archive.ts` contains a `--` token where a TypeScript comment is intended; and `api/admin/profile.ts` calls an invalid auth method with an undefined `userId`. `wrangler` targets Cloudflare while the plan specifies Vercel.
7. **Plan is stale:** `plan.md:4, 51-66` still says `backend/`, `storefront_temp/`, and `supabase/` are not present, although they now exist. Roadmap tasks remain unchecked and describe implementation work that has only been scaffolded.
8. **Repository cleanup:** several empty, untracked top-level directories (`backendapiadmin`, `backendapicron`, `backendapistore`, `backendapiwebhooks`, `backendlib`) are outside the documented layout and should be removed or incorporated intentionally.

## Recommended closure order

1. Select one supported deployment/runtime model (Vercel Node functions or a deliberate Hono adapter); align `backend/package.json`, `backend/vercel.json`, handler signatures, CORS, environment variables, and local development commands.
2. Repair migrations so all ten apply cleanly to a fresh Supabase dev project. Add missing tables/views/functions and explicit RLS policies; add migration tests before wiring the frontends.
3. Implement and test authentication on every admin route: cryptographically verify Supabase tokens, check current active staff status/role, use the user-scoped client where RLS is intended, and reserve service-role access for explicitly authorized operations.
4. Replace placeholder `place_order` with a single atomic transaction that validates request shape, fetches authoritative prices, locks/checks stock, applies coupon rules, writes order/items and exactly one inventory movement per line, and is idempotent.
5. Correct the inventory trigger design so each movement adjusts stock once and insufficient stock rejects the transaction; test concurrent orders and return/restock idempotency.
6. Add the outbox schema and a real worker with bounded claiming/locking, retry state, idempotency, email/WhatsApp senders, and delivery/error logging. Add an authenticated admin polling or notification path.
7. Finish the temporary storefront cart, customer address/payment fields, Turnstile, API origin configuration, and checkout error/success states. Verify the store API returns only safe public data.
8. Wire the admin login/session and all feature screens to API-backed data; migrate feature groups incrementally and preserve demo mode only as an explicit development option.
9. Add CI gates for TypeScript, unit/API tests, migration tests, RLS role tests, and an end-to-end test proving: one valid order appears in admin, decrements stock once, duplicate retries do not duplicate orders, and the outbox produces a visible/sendable notification.
10. Update `plan.md` only after the above behaviors are verified; deploy to production only after the fresh-database migration and end-to-end gates pass.

## Production decision

**Do not deploy the current backend as a public service, connect it to live customer data, or accept real orders.** First resolve the critical runtime, authorization, migration, checkout, inventory, and notification blockers. The present state is a prototype/scaffold, not a complete implementation of the roadmap.
