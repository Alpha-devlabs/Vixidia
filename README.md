# Vixidia website

Company website and product catalogue for Vixidia, with a browser-only interactive demo of **Business Analytics** at `/products/pulse/try` and interactive sample-data demos of the **Invoice & Payment Tracker** (`/products/invoice-payment-tracker/try`), **Simple CRM** (`/products/simple-crm/try`), **Tasks & Follow-ups** (`/products/tasks-follow-ups/try`), **Leave & Attendance** (`/products/leave-attendance/try`) and the first industry-specific solution, **Water Delivery Management** (`/products/water-delivery-management/try`).

Stack: React 19, TypeScript (strict), Vite, React Router 7, Tailwind CSS 4, Lucide icons, Vitest.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server (nested URLs like `/products/pulse/try` refresh correctly) |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Strict TypeScript check only |
| `npm test` | Unit tests (product registry, Business Analytics calculations, invoice, CRM, task and attendance rules, inquiry validation) |
| `npm run lint` | ESLint |

## Where things live

```
src/
  app/            App shell, route table, layout, scroll reset
  components/     Shared UI: Button, Header, Footer, Dialog, ProductCard, StatusBadge…
  config/         brand.ts (name, tagline), products.ts (product registry), routes.ts
  data/           pulseSample.ts — the fictional sample business for the demo
  features/
    pulse/        Business Analytics demo (internal name Pulse): pure logic (pulseLogic.ts), state hook, dashboard components
    crm/          Simple CRM demo: rules (crmLogic.ts), state hook, directory, profile, forms
    tasks/        Tasks & Follow-ups demo: rules (taskLogic.ts), state hook, list, form, detail drawer
    solutions/    Solutions finder: catalogue search, idea cards, request-a-solution dialog
    leave/        Leave & Attendance demo: rules (leaveLogic.ts), state hook, daily list, leave requests, profiles
    water/        Water Delivery Management demo: rules (waterLogic.ts), state hook, delivery round, customers, payments
    inquiry/      Inquiry validation and the submission adapter
  hooks/          usePageMeta (document title + meta description)
  pages/          One component per route
  styles/         Tailwind entry and design tokens (@theme)
  types/          Shared types
  utils/          Product path helpers, date arithmetic, formatting
```

## Design system

All colours are semantic tokens defined once per theme in `src/styles/index.css` and exposed to Tailwind (`bg-canvas`, `bg-surface`, `text-fg`, `text-fg-muted`, `border-line`, `bg-accent`, `text-success-strong`, `bg-chart`, …). Components never use raw colours, so one component works in both themes.

| Role | Tokens |
|---|---|
| Surfaces | `canvas` (page), `surface` (cards, dialogs), `subtle` (muted fills), `inverse` (dark brand bands) |
| Text | `fg`, `fg-muted`, `fg-subtle`, `on-accent`, `on-inverse`, `on-inverse-muted` |
| Lines | `line` (dividers), `line-strong` (form-control borders) |
| Brand | `accent` (indigo #5146E5 in light), `accent-hover`, `accent-soft`, `accent-strong` (accent-coloured text) |
| Status | `success` / `warning` / `danger`, each with `-strong` (text) and `-soft` (backgrounds) |
| Charts | `chart`, `chart-active`, `chart-grid`, `chart-track` |
| Focus | `focus` |

Contrast was checked numerically:
- Text tokens are at least 4.5:1 on canvas, surface and subtle in both themes.
- Control borders, focus rings and chart marks are at least 3:1.
- Badge text on its tinted background is at least 4.65:1.

Status is never shown by colour alone: badges always carry a word and an icon.

Shared building blocks live in `src/components/`:
- `Button` (primary, secondary, subtle, destructive, inverse; 36/40/48px).
- `Badge` and `StatusBadge`.
- `forms.tsx` (`Field`, `FieldGroup`, `controlClass`; 40px controls).
- `Panel` and `Card`.
- `Dialog` (dialog or right-hand drawer, native `<dialog>`).
- `Toast`.

## Themes

- **Where it lives:** `src/theme/theme.ts` sets `data-theme="light|dark"` on `<html>`. `ThemeToggle` is in the site header and in every product shell.
- **Remembering the choice:** an explicit choice is saved in `localStorage` (`vixidia-theme`). Without one, the system preference is followed, and light is used when the system expresses none.
- **No flash:** a small inline script in `index.html` applies the theme before first paint. Keep it in sync with `theme.ts`.
- **Reduced motion:** honoured globally in `styles/index.css`.

## Invoice & Payment Tracker (demo, core logic)

`src/features/invoices/` contains:
- the screens: overview, invoice list, invoice detail, new-invoice form and record-payment drawer
- the rules they share

| File | Role |
| --- | --- |
| `money.ts` | Exact INR maths. Amounts are whole **paise** (integers). Typed text is parsed digit by digit, and multiplication uses BigInt with one half-up rounding to the paisa. |
| `invoiceLogic.ts` | The single source of truth. It covers line, subtotal, GST and total calculation, status rules, the derived row for each invoice, overview figures, and the pure `createInvoice`, `markSent` and `recordPayment` functions. These return a new book or field errors. |
| `invoiceView.ts` | List and dashboard helpers: ageing buckets, filters and overdue ordering. They only rearrange rows. |
| `useInvoiceDemo.ts` | In-memory state for the demo, with a reset back to the sample data. |

Stored data is only what a person enters: lines, GST rate, dates and individual payments. Totals, amount paid, balance and status are always derived, so the list, detail view and overview cannot disagree.

Calculation order:
1. Line amount = quantity × rate, rounded half up to the paisa.
2. Subtotal = the sum of the line amounts.
3. GST = subtotal × the invoice's GST rate, rounded half up.
4. Total = subtotal + GST.

Prices are GST-exclusive. There is no discount.

Status rules:
- **Draft** until it is marked as sent.
- **Paid** when payments cover the total, whatever the date.
- **Overdue** from the day after the due date. This applies even when part of the invoice is paid; the remaining balance is shown alongside.
- **Partially paid** if some of it is paid but it is not yet due.
- Otherwise **Awaiting payment**.

Dates are calendar days (`YYYY-MM-DD`) compared as strings, so time zones cannot shift them.

Payment rules:
- The invoice must exist and must have been sent.
- The amount must be more than zero and no more than the balance still due. Overpayments are not supported.
- The date must be a real date, not in the future and not before the invoice date.
- Every payment is kept as its own record.

Nothing is persisted. Reload or **Reset demo** restores `src/data/invoiceSample.ts`, and no money moves.

Open questions, not decided in code:
- Splitting CGST/SGST from IGST.
- Different GST rates per line. The form offers 18% or none, and the model stores one rate per invoice.
- Rounding the invoice total to the nearest rupee.
- Discounts, credit notes and overpayments.
- Editing or deleting payments.

## Solutions finder (`/products`)

The **Solutions** page (main nav and footer; the URL stays `/products`) is a search-first catalogue.

- **Data:** products come straight from the product registry (`src/config/products.ts`), each with a `searchKeywords` list. A product with an `industry` (currently only Water Delivery Management) is listed under Industry-specific; the others are General business tools. Planned industry ideas live in `src/config/solutionIdeas.ts`. They are catalogue entries only, with no route, page or demo. When an idea gets a real demo it moves to the registry, as Water Delivery Management did, so it is never listed twice.
- **Search (`src/features/solutions/catalog.ts`):**
  - Text is normalised: lower case, accents removed, `&` read as "and", punctuation removed, simple plurals reduced.
  - Every meaningful query word must match the start of a word in the name, category or industry, keywords or summary. Filler words such as "software" or "management" are ignored.
  - Results are ranked by where the words matched. Ties keep catalogue order: products first, then ideas.
- **Filters:** category filters are All solutions, General business tools, Industry-specific and Planned ideas. They combine with the search. The query and category live in the URL (`?q=…&category=…`).
- **Request a solution (`solutionRequest.ts` and `RequestSolutionDialog.tsx`):**
  - The form validates the request, then tells the visitor plainly that nothing was sent or stored, and offers a copy to keep.
  - `submitSolutionRequest` returns `not_connected`. Replace it when a real enquiry service exists; the form does not need to change.

## Simple CRM (demo, Phase 0)

`src/features/crm/` is a design-first demo for customer management: an overview, a customer directory, customer profiles, add and edit forms, and an interaction log. It runs on fictional records from `src/data/crmSample.ts`, held in memory by `useCrmDemo.ts` (the same pattern as the invoice demo). Nothing is saved, and no email, message or call is ever made. **Reset demo** or a reload restores the sample data.

| File | Role |
| --- | --- |
| `crmLogic.ts` | Rules shared by every screen: derived rows, overview counts, search and filter, plus the pure `createCustomer`, `updateCustomer` and `addInteraction` functions, which return a new book or field errors. |
| `CrmApp.tsx` | The shell: sidebar, overview, directory and view switching. |
| `CustomerTable`, `CustomerProfile`, `CustomerForm`, `LogInteractionDrawer` | The screens. They show the rules' results and hold no rules of their own. |

Rules:
- **Statuses:** prospect, active or inactive.
- **Required fields:** a name, plus an email or a phone number.
- **Email:** must look like an address and must be unique across customers.
- **Phone:** any country's format, 6–15 digits, with an optional leading `+`.
- **Tags:** comma-separated, saved in lower case with duplicates removed, up to 8.
- **"No recent contact":** a prospect or active customer whose last interaction, or the day they were added if there is none, was more than 30 days ago. Inactive customers are never flagged. This describes the data and does not schedule anything; reminders belong to Tasks & Follow-ups.

Out of scope for this phase: persistence, deleting customers or interactions, importing, team access, and any link to invoices or Business Analytics.

## Tasks & Follow-ups (demo, Phase 0)

`src/features/tasks/` is a design-first task manager. It has an overview, a task list, a Follow-ups view, create and edit forms, and a details drawer. It runs on fictional tasks from `src/data/tasksSample.ts`, held in memory by `useTasksDemo.ts` (the same pattern as the other demos). **Reset demo** or a reload restores the sample data. Nothing is sent: there are no reminders, notifications or calendar links.

Date rules live in `taskLogic.ts`. Dates are calendar days compared as `YYYY-MM-DD` strings, so time zones cannot shift them.
- **Completed:** status is Completed, whatever the due date. A completed task is never overdue.
- **Overdue:** open (To do or In progress) and due before today.
- **Due today:** open and due today.
- **Upcoming:** open and due after today. The list splits this into *Next 7 days* and *Later*.

Other behaviour:
- **Filters and search:** filters for status, priority and category all apply together. Search covers the title, the description and the linked customer.
- **Sorting:** sort by due date (the default), priority or title. Completed tasks always come last, most recently completed first.
- **Completing and reopening:** completing a task records today as its completion date. Reopening clears that date and sets the task back to To do.
- **Follow-ups:** a follow-up is a task in the Follow-up category, not a separate system. A task can optionally link to one of the Simple CRM demo's sample customers by id. The customer list is read from `crmSample.ts`, never copied or changed. The two demos don't sync, and the CRM profile is not linked, because the CRM demo has no per-customer URL.

## Leave & Attendance (demo, Phase 0)

`src/features/leave/` is a design-first attendance and leave demo. It has:
- daily attendance with date navigation
- check-in and check-out for today
- attendance history for recent working days
- leave requests with demo approve and reject
- employee profiles

It runs on 14 fictional staff from `src/data/leaveSample.ts`, held in memory by `useLeaveDemo.ts`. **Reset demo** or a reload restores the sample data. Nothing is sent, and approval is a demonstration, not HR authorisation.

Rules live in `leaveLogic.ts`.
- **Calendar:** Monday–Friday are working days. Weekends are non-working and never count as absence. Public holidays are not modelled.
- **Demo "today":** the latest working day on or before the visitor's date, so a weekend visit shows Friday.
- **Day rules:** the day starts at 09:30. Check-in after 09:45 is late.
- **One status per person per working day, in this order**, so no one is counted twice:
  1. **On leave** if an *approved* request covers the date. Pending and rejected requests don't count.
  2. **Present** if a check-in is recorded. This can carry a *late* flag, or an *incomplete check-out* flag on a past day.
  3. **Absent** on a past day with no check-in.
  4. **Not checked in** today with no check-in yet.
- **Check-in and check-out:** today only.
  - No second check-in, and no check-in on approved leave.
  - Check-out needs a check-in, happens once, and must be later than the check-in.
- **Worked duration:** check-out minus check-in, only when both exist. Breaks are not recorded, and overtime isn't calculated.
- **Leave requests:**
  - Employee, type and dates are required.
  - The end date can't be before the start date, a request can be at most 60 days, and it needs at least one working day.
  - A request can't overlap another pending or approved request, or a day with recorded attendance. These conflicts are checked again on approval.

## Water Delivery Management (demo, Phase 0)

The first industry-specific solution: `/products/water-delivery-management` (details) and `/products/water-delivery-management/try` (demo). `src/features/water/` covers:
- **Today:** deliveries today, completed, pending, customers owing and cans with customers, then the day's list (quantity, empty cans, payment, delivery status) with filters and search.
- **Add order** (the main action on Today, and **New order** in a customer's account): pick an existing active customer by searching name, area or phone, or add a new customer in the same form. Then choose the day (today to 30 days ahead) and quantity. A regular order pre-fills the quantity. An order is a planned delivery, so nothing is charged until it's recorded as delivered. A customer can't have two planned deliveries on the same day, and paused customers can't take orders.
- **Deliveries:** record full cans and cartons delivered, empty cans collected and an optional payment at the door; mark a delivery failed; reschedule a pending or failed delivery.
- **Customers:** directory with search and an Active / Paused / Owes money filter; an account drawer with balance, cans held, deliveries and payments; add and edit with validation.
- **Payments:** outstanding balances (largest first), recent payments and recording a payment against a balance.

It runs on a fictional round, "Kovai Water Rounds" in Coimbatore, from `src/data/waterSample.ts`, held in memory by `useWaterDemo.ts`. Names, phone numbers (`+91 90000 0xxxx`) and addresses are invented. **Reset demo** or a reload restores the sample data. No money is collected and no one is contacted.

Only facts are stored (`src/types/water.ts`): customers with an opening balance and can count, deliveries, and payments. Every balance, can count and dashboard figure is derived in `waterLogic.ts`.
- **Prices:** ₹100 per 20-litre can, ₹150 per carton of twelve 1-litre bottles. All money is integer paise.
- **Charges:** a completed delivery charges delivered cans × ₹100 + cartons × ₹150. Empty cans returned are never charged. Scheduled, failed and rescheduled deliveries create no charge. A delivery can only be completed once, so it is charged once.
- **Balance:** opening balance + charges − payments.
- **Payments:** more than ₹0 and no more than what is owed at that moment. For a payment at the door that means the prior balance plus this delivery. Each payment is one record, so it reduces the balance once.
- **Reusable cans:** full cans delivered add to the customer's cans held; empties collected subtract. Empties can't exceed the cans held before the delivery, so the count never goes negative. Cartons aren't reusable and don't count. Movements come from the completion record, so reopening a completed delivery changes nothing.
- **Deliveries:**
  - Only today's scheduled deliveries can be completed or marked failed. Quantities are whole numbers from 0 to 50, and something must be delivered (otherwise mark it failed).
  - Rescheduling moves a pending or failed delivery to a date from tomorrow to 30 days ahead. The original stays on its day as *rescheduled* and a new scheduled delivery is created.
- **Regular orders** are a stated preference shown on the customer and used for planning. They don't generate deliveries automatically in this phase.

**Sample scenario** (reconciled in `waterLogic.test.ts`):
- 35 customers: 32 active, 3 paused; 24 with a regular order.
- 18 deliveries today: 6 completed, 12 pending.
- ₹6,950 outstanding across 11 customers.
- The worked example: Lakshmi Iyer receives 3 full cans, returns 2 empties and pays ₹150 by UPI. That is ₹300 charged, ₹150 left on this delivery, and +1 can held.

The ledger starts 14 days before the demo's today. Dates are relative to the visitor's date, like the other demos; for a given date the data is identical, and tests pin a fixed date.

Not in this phase: GST, invoices or credit notes, payment gateways, WhatsApp or SMS, GPS or route planning, automatic recurring orders, warehouse stock or supplier purchasing.

## The Business Analytics demo

**Business Analytics** was previously called Pulse. Only user-facing names changed. The product id, URL slug (`/products/pulse`, `/products/pulse/try`), the `src/features/pulse/` folder and component names such as `PulseDemo` keep the old name, so existing links, imports and tests still work.

Business Analytics is about **business performance**: it shows how a business is performing, not how to run its finances. Invoices, due dates, payments and customer balances belong to the separate Invoice & Payment Tracker.

The demo summarises a fictional business, “Harbor & Pine Supply Co.”, which sells homeware, stationery, gifts and gift services.

- **Sample data** (`src/data/pulseSample.ts`) comes from a seeded generator: about 180 days of orders across a 12-item catalogue. The same records appear on every load. Dates are anchored to the visitor’s today so the periods feel current; tests pin a fixed date.
- **Every figure is calculated** from those orders in `src/features/pulse/pulseLogic.ts`, which is plain, unit-tested functions.
- **Metric definitions:**
  - Revenue is the value of orders placed in the period.
  - Orders is the number of orders placed.
  - Average order value is revenue ÷ orders.
  - Items sold is the total units across orders.
  - Each figure is compared with the previous period of the same length.
- **Dashboard sections:**
  - Reporting period (7 / 30 / 90 days) and four KPIs.
  - A trend chart switchable between revenue, orders and average order value, with hover/focus readouts and a table view.
  - A sales breakdown by category or product.
  - Progress toward an editable revenue target.
  - Rule-based insights (fixed rules over the data, not AI).
  - Recent activity: new orders, first orders from new customers, monthly milestones and record days.
- **Reset** restores the sample data, target, period, chart metric and breakdown.
- State is held in memory only. Reloading restores the sample data, and the demo makes no network requests.

## Common changes

- **Rename the company:** edit `src/config/brand.ts`. Also update the static `<title>` and description in `index.html`.
- **Rename a product URL:** change its `slug` in `src/config/products.ts`. Links everywhere are built from the registry; internal code refers to products by `id`, which should not change.
- **Change a product's status:** set `status` to `planned`, `in_build` or `live` in the registry. Cards, badges and calls to action follow. A product only shows an “Open” link when it is `live` *and* has an `appUrl`.
- **Add a demo for another product:** add a `demo` entry to the product, add its id to `DemoId` in `src/types/product.ts`, and register the component in `src/pages/ProductDemoPage.tsx`.
- **Connect the inquiry form to a backend:** replace `submitInquiry` in `src/features/inquiry/inquiry.ts` with a real implementation returning `{ status: 'delivered' }` or `{ status: 'failed', message }`. The form and confirmation page already handle both. Update `src/pages/PrivacyPage.tsx` at the same time.

## Deployment

The app is a static single-page app. The host must serve `index.html` for unknown paths so deep links work. `public/_redirects` does this on Netlify; other hosts need their equivalent rewrite rule.

## Honest-by-design notes

- All six products (Business Analytics, Invoice & Payment Tracker, Simple CRM, Tasks & Follow-ups, Leave & Attendance and Water Delivery Management) are labelled **In development**, not live, even though their demos work.
- The inquiry form does not send anything yet and says so on the form and the confirmation page.
- The privacy page is marked as a draft that needs review before launch.
- No trademark or domain clearance has been checked for the name “Vixidia”.
