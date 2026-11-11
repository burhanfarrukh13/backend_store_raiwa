# Baytak Noor Admin — Feature, Function & Tab Map

This folder is a self-contained, navigable replica of the Baytak Noor store admin
shell and dashboard. The visual language, navigation, page headers, controls and
responsive behaviour follow the reference admin. All records, names, orders,
reviews and financial figures are **fictional demo data**.

Every one of the 28 navigation destinations now opens a working screen. Lists
support search, tabs, filters, create/edit forms, delete confirmation,
archiving, CSV export where relevant, and persistence in `localStorage`.

Run it with:

```bash
cd site_admin
python -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

---

## 1. Global shell

| Element | Function |
| --- | --- |
| Brand lockup | Logo + store name + `Store Manager`; links to the dashboard. Updated when the store name or logo changes in Settings. |
| **View Store** | Storefront action in the demo (shows a toast). |
| Desktop sidebar | Fixed 256 px rail, five groups, all 28 links, independent scrolling. Visible at ≥1024 px. |
| Active nav item | Black pill, light text, right chevron, `aria-current="page"`. |
| **Back to Storefront** | Storefront action in the demo. |
| Admin identity card | Avatar, profile name, `ADMIN` badge; links to Admin Profile. Updated from Profile settings. |
| Sign-out | Confirmation modal, then a demo sign-out toast. |
| Mobile top bar | 64 px bar with hamburger, brand and **Store** shortcut below 1024 px. |
| Mobile drawer | Slide-in navigation with overlay, close button, scroll lock; closes on overlay click, Escape, or link selection. |
| Hash router | `#/` dashboard, `#/products`, `#/orders`, … `#/profile`; unknown routes fall back to the dashboard. |
| Demo store | `localStorage` key `baytakNoorAdminClone.v1`; seeded on first visit. Profile → **Reset demo data** restores it. |
| Toasts & modals | Shared feedback, confirmation dialogs, form dialogs, focus return and Escape handling. |

### Navigation groups (28 destinations)

| Group | Tabs |
| --- | --- |
| Overview | Dashboard, Analytics, Accounting, AI Assistant |
| Catalog | Products, Inventory, Suppliers, Categories, Collections, Media Library |
| Sales & Customers | Orders, WhatsApp Messages, Email Log, Coupons, Reviews, Waitlist |
| Content & Marketing | Blog Articles, Custom Pages, FAQ Manager, URL Redirects, Newsletter, Inbound Contact |
| System | Store Settings, Phone App & Alerts, Add-ons, Staff & Roles, Archive, Admin Profile |

---

## 2. Dashboard

| Element | What it does |
| --- | --- |
| Welcome panel | “Welcome back, {profile name}” and “Everything in your store admin, by section.” |
| Five group cards | Overview, Catalog, Sales & Customers, Content & Marketing, System. |
| Section rows | Icon, section name, one-line description and hover chevron; each links to its screen. |
| Responsive grid | One column, two at ≥768 px, three at ≥1280 px. |

The dashboard is a navigation hub; it does not load real store records.

---

## 3. Tab-by-tab reference

Legend: **Working screen** = real interface plus demo data and actions.
All data is fictional.

### 3.1 Overview

#### Analytics
**Purpose:** visitors, sales, profit and attribution.

**Present**
- KPI cards: net revenue, average order value, conversion rate, repeat-order rate and store profit.
- Period selector: last 7 / 30 / 90 days; metrics recompute from the demo orders.
- **Overview** tab: seven-day revenue bar chart, channel attribution, top products and abandoned-checkout figures.
- **Products** tab: units sold, revenue, gross margin and stock per product.
- **Customers** tab: cohorts by first order month, repeat buyers, revenue, and top customers by spend.
- **Export** downloads an `analytics-summary.csv` of the selected period.

**Buttons/controls:** period select, **Export**, tab bar.

#### Accounting
**Purpose:** true profit after product costs, delivery, ads, tax and running costs.

**Present**
- Period selector and **Sync now**.
- KPI cards: books readiness, net profit, revenue and total costs.
- Revenue-vs-costs chart and a books-readiness summary.
- Eight working section tiles: **Profit & loss**, **Expenses & bills**, **Product costs**, **Courier payments**, **Marketing spend**, **Tax**, **Reports**, **Books setup**.
- Profit & loss statement; order-level profit table.
- Add/delete expenses; edit product cost prices; mark courier settlements paid; add marketing spend with attributed orders/revenue and ROAS.
- Tax summary and tax-settings link; setup checklist toggles; readiness progress.
- Report exports: profit & loss, expense ledger, courier settlement and product profitability CSV.

**Buttons/controls:** period select, **Sync now**, eight tiles, **Add expense**, **Add spend**, **Edit cost**, **Mark paid**, checklist switches, four report cards.

#### AI Assistant
**Purpose:** connect Claude or ChatGPT to store data through a remote connector.

**Present**
- Connector address with copy button and dark address panel.
- Claude and ChatGPT setup cards with step-by-step instructions.
- Privacy switch that changes the shared-data state and explanatory copy.
- Permission choice: read only, propose changes, full control.
- Change areas: products/inventory, prices/discounts, coupons, orders/customers, homepage, accounting, messages; saved per toggle.
- Connected apps table with provider, permission and connection date; **Disconnect** with confirmation.
- **Connect app** dialog adds a new app; **Save changes** persists permission changes.

#### Catalog

#### Products
**Purpose:** product catalog with variants, pricing, stock and imagery.

**Present**
- Searchable table: image, product name, SKU, variant count, category, price/compare-at price, stock and status.
- Status filter: all, Active, Draft, Archived.
- **Create Product** / edit dialog mirrors the live create screen, grouped into sections: **Basic Information**, **PDP Bullets**, **Pricing & Valuation**, **Cost & Profit Analytics**, **Inventory & Fulfillment**, **Product Media Gallery**, **Variants Matrix**, **Status & Organization**, **Categories**, **Collections** and **SEO Meta Tags**.
- Basic information: product name, auto-generated URL slug and full description.
- PDP bullets: bedding size, fabric/quality and bedding included/items.
- Pricing: retail price and compare-at price; cost analytics: COGS and shipping/packaging expenses.
- Inventory: SKU with **Auto-Generate**, on-hand stock, and an optional variants matrix with size, colour, variant SKU, price and stock per row.
- Media gallery: multiple images (up to 20 in the demo), first image as cover, remove individual images; generated placeholder if none.
- Organisation: product status, brand/vendor, supplier, supplier code/link and homepage showcase flag.
- Multi-select categories and collections, plus SEO page title and meta description.
- Product stock is recalculated from variants when variant mode is enabled, or from the on-hand stock field for a single SKU.
- **Duplicate** copies the full field set and creates a draft with new variant IDs; delete moves the product to Archive.
- Created/edited/deleted products persist and immediately appear in Inventory, Collections and reports.

#### Inventory
**Purpose:** stock across every product variant.

**Present**
- Flattened variant table: product, SKU, variant, stock, stock status and adjust action.
- Search plus filter: all, low stock (≤5), out of stock, in stock.
- **Adjust stock** dialog sets the new level and recalculates the parent product total.
- **Export CSV** and **Refresh**.

#### Suppliers
**Purpose:** record where products are sourced and message suppliers.

**Present**
- Searchable supplier table with name, notes, WhatsApp/phone and product count.
- Add/edit supplier form; delete with archive confirmation.
- **WhatsApp** action opens a demo supplier message composer.

#### Categories
**Purpose:** hierarchical storefront taxonomy.

**Present**
- Category tree/list with parent indentation, slug, parent, product count and status.
- Search, **New Category**, edit and delete.
- Create/edit form mirrors the live form: name, required URL slug, parent category, description, portrait/card image, landscape hero banner, image alt text, assigned products, SEO page title and meta description, status, navigation sort order and featured flag.
- Deleting a parent detaches its children; categories are archived.

#### Collections
**Purpose:** manual and smart product groupings.

**Present**
- Searchable collection table with type, rule, product count and status.
- Add/edit collection form mirrors the live form: name, required URL slug, description, Manual/Smart type, smart rule, product assignment, portrait/card image, landscape banner, alt text, SEO title/description, status, display sort order and featured flag.
- **Duplicate** creates a draft copy; delete moves the collection to Archive.

#### Media Library
**Purpose:** product photography and marketing assets.

**Present**
- Asset grid with preview, filename, size, alt text and actions.
- **Upload Media** reads local images (≤700 KB), stores them as data URLs and saves name/size/date.
- Filter by filename or alt text; edit alt text; copy URL; delete to Archive.
- Empty state still exposes the upload control.

---

### 3.2 Sales & Customers

#### Orders
**Purpose:** track, filter, fulfil and manage orders and courier details.

**Present**
- Search by order number, customer, email, phone or tracking.
- Filters: payment status, fulfillment status, customer type (all/repeat/first-time).
- Summary strip: visible orders, paid revenue, unpaid, unfulfilled.
- Table: bulk checkbox, order number, date, customer, courier/tracking, payment, fulfillment, item count, total, **View**.
- Bulk selection bar with **Mark fulfilled** and **Clear**.
- **Sync PostEx Status** fills missing PostEx tracking numbers; **Refresh**.
- Order side panel: status summary, customer details, buyer type, item lines, subtotal/shipping/discount/total, and editable payment, fulfillment, courier, tracking and notes.
- Side-panel actions: **Save changes**, **Mark fulfilled**, **WhatsApp** (opens the matching thread), **Invoice** (demo), **Refund** with confirmation.
- Order changes persist and feed the dashboard analytics.

#### WhatsApp Messages
**Purpose:** order conversation history and direct customer messaging.

**Present**
- Tabs: **All**, **Needs Reply**, **Confirmed**, each with live counts.
- Split view: conversation list with avatar, customer, order number, last message, time and unread dot; thread on the right.
- Thread shows store/customer bubbles, timestamps, confirmation badge and order shortcut.
- Composer sends a message and clears the reply flag.
- **Confirm order** marks the thread confirmed and appends a confirmation message.
- Quick replies fill the composer; **Refresh** reloads the view.
- Empty and non-matching tab states.

#### Email Log
**Purpose:** record every customer email and its delivery result.

**Present**
- Read-only log table: recipient, subject, template, delivery result and timestamp.
- Search and delivery filter: all, Sent, Failed, Not sent (email not set up).
- View dialog with metadata, error detail and a text email preview.
- **Resend** appends a new Sent log entry (demo).

#### Coupons
**Purpose:** promotional codes, percentage/fixed discounts and usage rules.

**Present**
- Tabs: all, active, inactive, expired with live counts.
- Table: code, discount, minimum order, usage, expiry and effective status.
- Create/edit form: coupon code, internal description/campaign notes, percentage/fixed type, discount value, minimum order, maximum total uses, start date, expiration date and active status.
- Copy code, edit, delete to Archive.
- Expiry is evaluated against the demo date (`2026-11-11`).

#### Reviews
**Purpose:** moderate ratings and photo reviews.

**Present**
- Tabs: Pending, Approved, All with counts.
- Review cards: stars, title, body, customer, product, date and photo-review chip.
- **Approve**, **Reject**, **Unpublish** and delete actions; changing state updates counts.
- **Import CSV** adds two pending demo reviews; **Refresh**.

#### Waitlist
**Purpose:** back-in-stock demand and subscriber notifications.

**Present**
- **Product Demand Summaries** tab groups subscribers by product, waiting count, notified count and restock date.
- **All Subscribers Log** tab lists email, phone, product, request date and notification status; remove a subscriber.
- **Add subscriber** form with email, phone, product and restock date.
- **Notify all** asks for confirmation, marks the group notified and reports the count.

---

### 3.3 Content & Marketing

#### Blog Articles
**Purpose:** journal articles, guides and brand stories.

**Present**
- Searchable article table: title/excerpt, author, category, status, publish date and views.
- Create/edit form: article title, required URL slug, category, author, status, publish date, views, summary excerpt, article body, featured hero image URL, tags, SEO page title and meta description.
- **Preview** modal; publish/unpublish toggle; delete to Archive.

#### Custom Pages
**Purpose:** About, policies, terms and other static CMS pages.

**Present**
- Searchable page table with title, content preview, slug, status and last update.
- Create/edit with title, required URL slug, status, SEO page title, meta description and page content; preview modal; delete to Archive.

#### FAQ Manager
**Purpose:** categorized storefront help questions.

**Present**
- Ordered FAQ table with question, answer preview, category, status and sort order.
- Category filter and search; **New FAQ**.
- Create/edit with question, answer, category, published/draft and sort order.
- Move up/down, publish/unpublish and delete actions.

#### URL Redirects
**Purpose:** map old URLs to new destinations.

**Present**
- Table: from path, to path, 301/302 type, hits and status.
- Filters for redirect type and active/disabled status.
- **Create redirect** and **Import CSV** (adds two demo redirects).
- Copy path, enable/disable, edit and delete to Archive.

#### Newsletter
**Purpose:** newsletter subscriber management.

**Present**
- Tabs: all, active, inactive with counts.
- Table: email, name, source, join date and status.
- Search, **Add subscriber**, edit, toggle status, delete to Archive.
- **Export CSV** of the subscriber list.

#### Inbound Contact
**Purpose:** read, filter and reply to contact-form inquiries.

**Present**
- Tabs: all, unread, read with counts.
- Table: sender, email, subject, message preview, received time and read state.
- Open dialog marks the message read and shows full text and previous reply.
- **Reply** dialog records the reply, marks the inquiry read, and writes an entry to the Email Log.
- Delete inquiry with confirmation.

---

### 3.4 System

#### Store Settings
**Purpose:** branding, contact details, theme, shipping, payments, couriers, email, tracking, social and SEO.

**Present**
- Ten tabs: **Store Identity**, **Contact Details**, **Theme & Styling**, **Shipping & Taxes**, **Payment Methods**, **Couriers & Logistics**, **Email & WhatsApp**, **Analytics & Tracking**, **Social Channels**, **SEO & Domain**.
- **Save changes** persists all current tab fields; switching tabs keeps edits.
- Identity: store name, currency, tagline, country, logo upload (≤200 KB) and preview.
- Contact: support email, phone, WhatsApp and address.
- Theme: primary/accent colours, radius and heading font; live preview card; reset-default button.
- Shipping/tax: flat rate, free-shipping threshold, COD fee and tax rate.
- Payments: COD, bank transfer, card toggles plus bank details.
- Couriers: default courier, account and demo API key.
- Email/WhatsApp: from name, reply-to, copy-orders toggle and Cloud API token; test-email demo.
- Tracking: GA4, GTM, Meta and TikTok IDs.
- Social and SEO fields, indexing toggle and canonical domain.
- Brand name/logo in the shell update immediately after save.

#### Phone App & Alerts
**Purpose:** install the admin like a mobile app and manage alerts.

**Present**
- Phone mock preview and install call-to-action.
- Uses the browser `beforeinstallprompt` event when available; otherwise explains Add to Home Screen steps.
- **Send test alert**, notification toggles, low-stock and daily-summary preferences.
- Device/session table with revoke and **Sign out other devices**.

#### Add-ons
**Purpose:** optional store capabilities with trials and billing.

**Present**
- Four add-on cards (Accounting, Abandoned Cart, Loyalty, Advanced Reports) with status, features and pricing.
- Monthly/yearly toggle with yearly “2 months free” pricing.
- **Start 14-day trial**, **Keep for Rs. …**, **Stop trial**, and **Manage** with cancellation.
- Summary strip: active count, trial count, monthly total.
- **Billing history** modal.

#### Staff & Roles
**Purpose:** team accounts and permissions.

**Present**
- Team table: member avatar, name, email, role, status and last active.
- **Invite team member** form (name, email, role, status); edit, suspend/activate, resend invite and remove.
- Current admin cannot be removed.
- Search and CSV export.
- Role-permission matrix for Owner/Admin, Manager, Support and Accountant across nine sections.
- Removing a member archives the record.

#### Archive
**Purpose:** recover deleted records.

**Present**
- Searchable archive table with item, type, deleted timestamp, **Restore** and permanent **Delete**.
- Type filter and counts.
- Restore returns products, pages, coupons, staff, media and removed variants to their collections.
- **Empty archive** permanently clears all archived entries after confirmation.

#### Admin Profile
**Purpose:** administrator identity and credentials.

**Present**
- Profile summary card: avatar, name, role, member since.
- Identity form: name and email; role and last sign-in read-only; **Save profile** updates the shell and matching staff record.
- Password form: current, new and confirm; checks the demo current password, ≥8 characters and matching confirmation.
- Active sessions table with revoke and **Sign out other sessions**.
- **Reset demo data** clears local changes and restores the fictional seed.

---

## 4. Data model & persistence

`assets/data.js` seeds all demo records:
products/variants, orders, emails, coupons, reviews, waitlist, blog, pages,
FAQs, redirects, subscribers, inquiries, staff, WhatsApp threads, archive,
expenses, marketing, courier payments, setup steps, AI settings, add-ons,
devices, profile and store settings.

`assets/store.js` exposes:

| Method | Purpose |
| --- | --- |
| `init()` | Load `localStorage`, merge with the seed, save. |
| `save()` | Persist the full demo state. |
| `get/set` | Read or replace a top-level collection/object. |
| `list/byId` | Read arrays and find rows by ID. |
| `add/update/remove` | CRUD with new demo IDs. |
| `archiveItem/restoreArchive/purgeArchive` | Archive lifecycle. |
| `productById/productName/variants` | Product helpers. |
| `reset()` | Restore the seed. |
| `applyTheme()` | Apply primary/accent/radius/font CSS variables. |

All money uses PKR and `Rs.` formatting. The demo “today” is **2026-11-11**.

---

## 5. File structure

```
site_admin/
├── index.html                 shell: sidebar, mobile bar/drawer, mount
├── FEATURES.md                this map
├── assets/
│   ├── logo.png
│   ├── styles.css             design tokens + shell/dashboard styles
│   ├── components.css         tables, forms, modals, panes, settings, AI, add-ons
│   ├── core.js                icons, escaping, money/date helpers, toasts, modals, CSV, empty states
│   ├── tabs.js                nav groups, 28 section metadata, 10 settings tabs
│   ├── data.js                complete fictional seed
│   ├── store.js               localStorage CRUD, archive, theme, reset
│   ├── list.js                generic searchable/filterable/tabbed table + form engine
│   ├── page-catalog.js        products, inventory, suppliers, categories, collections, media
│   ├── page-sales.js          orders, WhatsApp, email log, coupons, reviews, waitlist
│   ├── page-content.js        blog, pages, FAQ, redirects, newsletter, contact
│   ├── page-create-forms.js   live-parity product, category and collection forms
│   ├── page-system.js         analytics, accounting, AI, settings
│   ├── page-extras.js         phone app, add-ons, staff, archive, profile
│   └── app.js                 shell renderer, dashboard, hash router, drawer, boot
```

---

## 6. Verification performed

- `node --check` passes on every JavaScript file.
- All 28 routes render a page heading without console errors.
- Full product form creation with slug, description, simple stock, generated image and fallback variant; stock recalculation and cleanup.
- Full category and collection creation with the expanded live field sets and cleanup.
- Blog, page and coupon dialogs expose the live-style fields (SEO, tags, hero image, start/expiration dates).
- Order detail side panel opens with customer/items/status.
- WhatsApp message send appends to the thread.
- Review approval updates the pending count.
- Add-on trial activation updates status/trial counts.
- Archive restore returns an item and reduces the archive count.
- Settings save persists the store name and updates the sidebar brand.
- Desktop at 1386 px: 256 px sidebar, 32 px content padding, 12 px panel radius, no page-level horizontal overflow.
- Orders tables scroll inside their `.table-wrap`, not the page.

**Intentional limitations:** no backend, authentication, real email/WhatsApp/courier services, real payment processing or real storefront. Images uploaded in Media/Products are stored as data URLs in browser storage and therefore share the browser quota; large files are rejected. The storefront links show a demo toast.
