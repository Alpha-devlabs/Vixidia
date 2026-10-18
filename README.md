# Vixidia website

Company website and product catalogue for Vixidia, with a browser-only interactive demo of **Business Analytics** at `/products/pulse/try` and interactive sample-data demos of the **Invoice & Payment Tracker** (`/products/invoice-payment-tracker/try`), **Simple CRM** (`/products/simple-crm/try`), **Tasks & Follow-ups** (`/products/tasks-follow-ups/try`), **Leave & Attendance** (`/products/leave-attendance/try`) and the industry-specific solutions **Water Delivery Management** (`/products/water-delivery-management/try`), **Gym Membership Management** (`/products/gym-membership-management/try`), **Salon Management** (`/products/salon-management/try`), **Tuition Centre Management** (`/products/tuition-centre-management/try`) and **Small Distributor Management** (`/products/small-distributor-management/try`).

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
    solutions/    Solutions finder and homepage search: shared catalogue and search, result and idea cards, request-a-solution dialog
    leave/        Leave & Attendance demo: rules (leaveLogic.ts), state hook, daily list, leave requests, profiles
    water/        Water Delivery Management demo: rules (waterLogic.ts), state hook, today's run, orders, customers
    gym/          Gym Membership Management demo: rules (gymLogic.ts), state hook, dashboard, members, attendance, payments
    salon/        Salon Management demo: rules (salonLogic.ts), state hook, schedule, booking, customers, services
    tuition/      Tuition Centre Management demo: rules (tuitionLogic.ts), state hook, dashboard, students, batches, attendance, fees
    distributor/  Small Distributor Management demo: rules (distributorLogic.ts), state hook, inventory, purchases, orders, payments
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

- **Data:** products come straight from the product registry (`src/config/products.ts`), each with a `searchKeywords` list. A product with an `industry` (Water Delivery Management, Gym Membership Management, Salon Management, Tuition Centre Management and Small Distributor Management) is listed under Industry-specific; the others are General business tools. Planned industry ideas live in `src/config/solutionIdeas.ts`. They are catalogue entries only, with no route, page or demo. When an idea gets a real demo it moves to the registry, as Water Delivery Management, Gym Membership Management, Salon Management, Tuition Centre Management and Small Distributor Management did, so it is never listed twice. The list is currently empty: the finder keeps its Planned ideas filter, which shows nothing until a new idea is added.
- **Search (`src/features/solutions/catalog.ts`):**
  - Text is normalised: lower case, accents removed, `&` read as "and", punctuation removed, simple plurals reduced.
  - Every meaningful query word must match the start of a word in the name, category or industry, keywords or summary. Filler words such as "software" or "management" are ignored.
  - Results are ranked by where the words matched. Ties keep catalogue order: products first, then ideas.
- **Filters:** category filters are All solutions, General business tools, Industry-specific and Planned ideas. They combine with the search. The query and category live in the URL (`?q=…&category=…`).
- **Request a solution (`solutionRequest.ts` and `RequestSolutionDialog.tsx`):**
  - The form validates the request, then tells the visitor plainly that nothing was sent or stored, and offers a copy to keep.
  - `submitSolutionRequest` returns `not_connected`. Replace it when a real enquiry service exists; the form does not need to change.

## Demo first run

Every demo at `/products/:slug/try` opens straight onto its real app. A compact strip under the demo header (`src/features/demo/DemoGuide.tsx`) shows:
- one sentence on what you can do in that demo;
- the data note: fictional sample data, changes last until you reload or choose Reset demo, nothing is saved or sent (true for every demo: all state is in memory, nothing uses browser storage);
- **Try first**: one suggested action. **Show me** scrolls to and focuses that real control on the first screen; it never clicks it or changes data. The suggestion can be hidden; the data note can't.

The wording and each suggestion's target live in `src/features/demo/demoGuides.ts`. A target is found by the control's existing accessible label (for example the first visible "Mark TW-… delivered" button), and the browser tests check that every one resolves to an enabled control.

**Reset demo** asks first when you've changed something (`useResetDemo`), and resets straight away when you haven't. Each demo's hook reports `changed` by comparing its data with the sample last loaded. The reset is the demo's own, which rebuilds the whole sample, so records, balances, ledgers and figures always come back together.

## Solution pages (`/products/:slug`)

`src/pages/ProductDetailPage.tsx` renders every solution from its registry entry; nothing is written per page.
- **First screen:** name, category and status, the one-line summary, who it's made for, and **Try live demo** (with "Browse other solutions"). The real demo preview sits beside it on wide screens and under it on narrow ones.
- **Then:** the problem it helps solve, what you can manage in the demo (`features`), how it works (`steps`: three or four, describing only what exists), who it's for, and about the demo (shared limitations wording plus `futureFeatures` as "Not in the demo yet"). The call to action repeats once at the end.
- **States** come from `detailState()` in `src/utils/products.ts`: a working demo (Try live demo), a design preview, a live app, or no demo yet (an honest "Demo not available yet" with a way back to available solutions). Demo links always come from the registry slug via `demoPath`, so `/products/pulse` and `/products/pulse/try` keep working.
- **Back to results:** links from the homepage search, the finder and product cards carry the page they came from in router state (`src/utils/origin.ts`), not the URL. The solution page then shows "Back to results for “…”", and the demo's Back link passes it along. A shared link or a new tab falls back to the Solutions breadcrumb.

## Homepage search (`/`)

The homepage leads with the same search as the finder (`src/features/solutions/HomeSolutionSearch.tsx`). It reads the one shared catalogue in `siteCatalog.ts` and ranks with `searchCatalog`, so the homepage and `/products` always agree.

- Results update as you type and appear directly under the field: up to four best matches (`HOME_RESULT_LIMIT`), each with its status, summary and actions (**Try demo** and **View solution** for products, using their existing routes; planned ideas get "I’d use this" and are labelled as not available yet). When there are more, **See all N in Solutions** opens `/products?q=…`.
- The query is kept in the URL as `?q=…`, the same parameter as the finder, so a refresh, a shared link or the back button shows the same results. Enter keeps the visitor on the homepage; Escape or the clear button empties the search.
- With no query it shows example searches (`exampleSearches`, each checked in `homeSearch.test.ts` to find a solution with a demo) and a link to browse all solutions. With no matches it offers suggestions, browse all, and Request a solution.

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

## Water Delivery Management (demo)

The first industry-specific solution: `/products/water-delivery-management` (details) and `/products/water-delivery-management/try` (demo). This is the original water-delivery demo (the very first Vixidia demo, back when it was called Pulse), ported unchanged in behaviour and data onto the current design system. `src/features/water/` has:
- **Today's run:** orders today, still to deliver, collected today and outstanding dues; today's orders with search and filters (All, To deliver, Delivered, Unpaid, Paid); quick actions; and *Money to collect* per customer.
- **All orders:** every order across days, with the same search and filters.
- **Customers:** search by name or area, each customer's orders and dues, *Mark all dues paid* and *New order*.
- **Orders:** open an order for its details and notes; *Mark delivered* and *Mark paid*.
- **New order:** an existing customer, or a new one (name, area, type: household, shop or office), cans (1–50), *Collect on delivery* or *Already paid*, and an optional note. A new customer's name can't match an existing one.

It runs on a fictional business, "Thendral Water Delivery", from `src/data/waterSample.ts`, on a fixed sample day (18 March 2026). Order numbers look like TW-1042. State is held in memory by `useWaterDemo.ts`, so **Reset demo** or a reload restores the sample data, and nothing is sent anywhere.

Rules in `waterLogic.ts`:
- An order's amount is cans × ₹40 (one 20 L can). Amounts are whole rupees.
- Each order is either paid or unpaid. **Outstanding dues** are the total of every unpaid order on any day, delivered or not. An order can be marked paid before it is delivered.
- *Collected today* is today's paid orders; *billed today* is all of today's orders.
- *Mark all dues paid* marks every unpaid order of that customer paid.

Not in this demo: empty-can tracking, part payments, regular delivery schedules, failed or rescheduled deliveries, GST or invoices.

## Gym Membership Management (demo)

`/products/gym-membership-management` (details) and `/products/gym-membership-management/try` (demo). `src/features/gym/` has:
- **Dashboard:** total members, active memberships, expiring soon, expired, today's check-ins and outstanding balances; renewals due; recent activity; actions to register a member, check someone in and record a payment.
- **Members:** search by name, email or phone; filter by Active, Expiring soon, Expired or Owes money; a member drawer with memberships, the last 14 days of attendance and payments; register and edit with validation.
- **Attendance:** today's check-ins and a member search to check people in; earlier days (14 days) are read-only.
- **Payments:** outstanding balances, recent payments, and recording a payment.

It runs on a fictional gym, "Banyan Fitness Club", from `src/data/gymSample.ts`, on a fixed sample day (Thursday 15 October 2026). Names, phones (`+91 90000 2xxxx`) and emails (`@example.com`) are invented. State is held in memory by `useGymDemo.ts`, so **Reset demo** or a reload restores the sample data.

Only facts are stored (`src/types/gym.ts`): members, memberships, check-ins and payments. Rules live in `gymLogic.ts`:
- **Plans:** Monthly (1 month, ₹1,500), Quarterly (3, ₹4,000), Half-yearly (6, ₹7,500) and Annual (12, ₹13,500). Money is integer paise.
- **Dates:**
  - Adding months keeps the day of the month, clamped to the last day of a shorter month: 31 Jan + 1 month = 28 Feb (29 in a leap year). It never spills into the next month.
  - A membership of N months starting on S runs to the day before S + N months, inclusive. 15 Jan monthly runs to 14 Feb.
- **Status on a date:**
  - Active if a membership covers it. "Valid until" follows renewals that start the day after the previous one ends.
  - Expiring soon if valid until is at most 7 days away.
  - Expired if nothing covers it and nothing starts later. Starts later if the only membership begins after it.
  - The dashboard's Active count includes those expiring soon.
- **Renewal:**
  - Before expiry, the new membership starts the day after the current valid-until date, so no paid day is lost. After expiry, it starts on the renewal date.
  - A member with a renewal already waiting to start, or already renewed today, can't be renewed again.
- **Check-in:** today only, once per member per day, and only with a membership valid today. Expired members are refused with an explanation. Checking in never renews.
- **Money:**
  - Each membership, new or renewal, is one charge at the plan price. Balance = charges − payments.
  - A payment must be more than ₹0 and no more than the balance, and reduces it once. A payment can be taken while registering or renewing; it's still a separate payment record.
  - Payments are matched to memberships oldest first, only to show which are paid.

**Sample scenario** (reconciled in `gymLogic.test.ts`):
- 24 members: 19 with a membership valid today, 4 of them expiring within 7 days.
- 4 expired, and 1 whose membership starts later.
- 6 check-ins so far today.
- ₹11,500 owed by 6 members.
- It also includes two renewals waiting to start and a month-end renewal: 31 Aug monthly to 29 Sep, then 30 Sep to 29 Oct.

Not in this demo: renewal reminders, freezing memberships, refunds or credit, automatic billing, GST or invoices, trainers, classes, diet or workout plans, biometric or QR check-in.

## Salon Management (demo)

`/products/salon-management` (details) and `/products/salon-management/try` (demo). `src/features/salon/` has:
- **Schedule:**
  - A day view for any date from 14 days back to 60 days ahead.
  - Figures: appointments, still to come, completed (with unpaid count), cancelled and revenue.
  - Filters: All, Upcoming, Completed, Unpaid and Cancelled, plus stylist and search.
  - Each appointment shows start, end and duration, customer, services, stylist and status, with a "Coming up" list for the next 7 days.
- **Appointments:**
  - Book for an existing or new customer, choosing one or more services. The time and price are added up.
  - Pick a stylist, date and a free start time.
  - Reschedule, cancel with a reason, check out (pay now or later), and take payment for unpaid ones.
- **Customers:** search by name, phone or email; visits, last visit, usual service, next appointment, notes and full history; add and edit with validation.
- **Services & hours:** the menu (name, category, duration, price), opening hours and stylists with what they do.

It runs on a fictional salon, "Mehendi Lane Salon", from `src/data/salonSample.ts`, on a fixed sample day (Saturday 17 October 2026). Names, phones and emails are invented. One UK number uses the reserved drama range. State is held in memory by `useSalonDemo.ts`, so **Reset demo** or a reload restores the sample data.

Rules live in `salonLogic.ts`:
- **Time:**
  - Open 10:00–20:00, closed Tuesdays.
  - Appointments start on the quarter hour and must finish by closing.
  - Duration is the sum of the booked services; end = start + duration.
  - Bookings and reschedules go from today to 60 days ahead.
- **Conflicts** (cancelled appointments never count):
  - A stylist can't have overlapping appointments; back-to-back is fine.
  - A customer can't be in two overlapping appointments.
  - Stylists only do their categories: Meena and Ravi do hair, Shalini does skin and nails.
- **Status:**
  - A booked appointment can be checked out (completed) on or before the demo's today, rescheduled or cancelled.
  - Completed and cancelled appointments are final. There is no correction workflow in this demo.
- **Money (integer paise):**
  - Service names, durations and prices are copied onto the appointment at booking, so later menu changes don't rewrite it.
  - Only completed appointments can be paid: once, in full, with one payment record.
  - Revenue for a day = payments recorded that day. Bookings, cancellations and unpaid work are never revenue.
- **Customers:**
  - Phone numbers in any format (6–15 digits) are accepted.
  - Duplicates are caught on phone (last 10 digits when both have 10 or more) or email (ignoring case).

**Sample scenario** (checked in `salonLogic.test.ts`):
- Today has 13 appointments: 5 completed and 8 still to come, plus 1 cancellation.
- ₹4,700 was paid today, and one ₹2,500 colouring is completed but unpaid.
- 16 customers, many with repeat visits.
- The tests also check that no seeded appointment clashes, falls outside opening hours or lands on a Tuesday.

Not in this demo: partial payments or discounts, refunds, reminders or confirmations, online booking, calendar sync, commissions, payroll, stock or retail, GST.

## Tuition Centre Management (demo)

`/products/tuition-centre-management` (details) and `/products/tuition-centre-management/try` (demo). `src/features/tuition/` has:
- **Dashboard:** active students, active batches, classes and attendance for a chosen day, fees collected in a chosen month, fees outstanding (with overdue), the day's classes with "Take attendance", a "Coming up" list and fee follow-ups (overdue first).
- **Students:** search by name, school, guardian, phone or "grade N"; grade and status (active or left) filters. Add with optional batches matched to the grade; edit details; mark as left or make active. The profile shows guardian, batches, attendance and every fee with its payments.
- **Batches:** subject, grades, teacher, weekly days and start time, duration, classroom and monthly fee. Create, edit (including Not running), enrol students (optionally at their own fee) and remove them.
- **Attendance:** choose a batch and class date; mark Present, Late or Absent, "Mark the rest present", save or update.
- **Fees:** filters for month, batch, status and search; charged, collected, still due and overdue totals; generate next month's fees; record full or part payments by cash, UPI or card; recent payments.

It runs on a fictional centre, "Bright Path Tuition Centre" in Nagpur, from `src/data/tuitionSample.ts`, on a fixed sample day (Wednesday 21 October 2026). Names, schools and phone numbers are invented. State is held in memory by `useTuitionDemo.ts`, so **Reset demo** or a reload restores the sample data.

Rules live in `tuitionLogic.ts`:
- **Classes:** generated from each batch's weekly schedule from 1 September to 4 weeks ahead. Batches start between 7:00 am and 9:00 pm, last 30–180 minutes in 15-minute steps, and can't share a classroom at overlapping times.
- **Enrolment:** runs from a start date (inclusive) to an end date (exclusive). A student can only join an active batch covering their grade, once. Removing a student or marking them as left ends enrolments today and keeps past attendance and fees.
- **Attendance:** only students enrolled on the class date are on the sheet, so a student who joined later or left earlier doesn't count. Every student must be marked; future classes can't be marked. Attendance % = (present + late) ÷ students on the sheet.
- **Fees (integer paise):** one fee per student, batch and month, at the student's own fee if set or the batch fee at the time it is generated. Generating never duplicates and skips inactive batches and students who have left. Fees fall due on the 25th, or 7 days after joining if later. Status: paid, part paid, due, or overdue after the due date.
- **Payments:** more than ₹0 and no more than the balance. "Collected" for a month is the sum of payments dated in that month.
- **Students:** guardian phone required (10-digit numbers get +91); a duplicate is the same name with the same last 10 phone digits.

**Sample scenario** (checked in `tuitionLogic.test.ts`):
- 22 students (20 active, 2 left), 6 batches (5 running), 4 teachers.
- Today has 3 classes; English 6–8's attendance is already taken.
- October: ₹48,500 charged, ₹35,000 collected; ₹15,400 outstanding across all months, of which ₹1,900 is overdue, owed by 8 students.
- Generating October again adds nothing; November adds 31 fees.

Not in this demo: fee reminders or messages to parents, receipts, discounts or refunds beyond setting a student's own fee, exam marks, teacher payouts or payroll, online classes, logins, payment gateways, GST.

## Small Distributor Management (demo)

`/products/small-distributor-management` (details) and `/products/small-distributor-management/try` (demo). `src/features/distributor/` has:
- **Dashboard:** a reporting period (this month so far, last 7 days, last 30 days, last month). "In this period" shows sales (orders delivered), collected from customers, purchases (received) and paid to suppliers side by side, so sales are never confused with money received. "Right now" shows active products, low stock, stock value at cost and at selling price, what customers owe you and what you owe suppliers (with overdue amounts). Plus low stock, recent orders and recent activity.
- **Products & Inventory:** search, category, status and stock filters; add and edit products; stock adjustments with a required reason; each product's movements and a check that they add up. A **Stock movements** tab lists every movement with date, product, type, reference, reason, quantity in or out and the resulting balance.
- **Suppliers / Customers:** search by name, contact, phone or area; status and balance filters; add and edit; each one's purchases or orders and outstanding balance.
- **Purchases:** draft → received, or cancelled. Create (save as draft, or save and receive), edit drafts, receive with a confirmation, record payments to the supplier.
- **Sales Orders:** draft → confirmed → delivered, or cancelled. Create (save as draft, or save and confirm), edit drafts and confirmed orders, confirm, mark delivered, record payments from the customer.
- **Payments:** balances to collect and to pay (overdue vs not yet due), quick Pay buttons, and the full payment history with direction and method filters.

It runs on a fictional wholesaler, "Kaveri Wholesale Distributors" in Pune, from `src/data/distributorSample.ts`, on a fixed sample day (Friday 23 October 2026). Products are generic (no brand names); businesses, people, phones and emails are invented. The sample history from 1 September isn't typed in as results: it's replayed through the demo's own rules (receive, confirm, deliver, pay, adjust), so it reconciles by construction. State is held in memory by `useDistributorDemo.ts`, so **Reset demo** or a reload restores the sample data.

Rules live in `distributorLogic.ts`:
- **Stock** is counted in whole units of each product's unit (bag, carton, case, box, pack or piece). It is never stored on the product: it is the sum of the product's stock movements, and movements are only written by `moveStock`, which applies a whole batch or nothing and refuses anything that would go below zero. For every product, opening stock + purchases received + adjustments up − orders delivered − adjustments down = current stock.
- **Purchases:** drafts and cancelled purchases never touch stock; editing a draft changes nothing. Receiving adds every line once and can't be repeated. Received purchases can't be edited or cancelled.
- **Orders:** stock is deducted once, when an order is delivered. Confirming checks there's enough stock not already promised to other confirmed orders, but deducts nothing. Delivery checks stock on hand and is all-or-nothing, with a message naming what's short. Delivered orders can't be edited or cancelled (there's no correction workflow in this demo).
- **Lines** copy the product name, SKU, unit and price or cost when saved, so later product edits don't change history. Inactive products, suppliers and customers stay on past documents but can't be used on new or edited ones. References must be unique; quantities are whole numbers from 1 to 1,00,000. There is no tax or discount: total = sum of the lines.
- **Money (integer paise):** payments go against a delivered order or a received purchase only, by cash, UPI or bank transfer; more than ₹0 and no more than the balance. Each payment form has a request id, so a double submit records it once. Payments can't be edited or deleted. Receivables = delivered orders − customer payments; payables = received purchases − supplier payments; drafts, confirmed and cancelled documents owe nothing. The due date is the delivery or receiving date plus the customer's or supplier's credit days; overdue means a balance after that date.
- **Inventory value** is stock × the product's current purchase cost; "at selling price" is stock × current selling price and is only a potential value.

**Sample scenario** (checked in `distributorLogic.test.ts`):
- 18 products in 4 categories (17 active, 5 low on stock), 5 suppliers (1 inactive), 8 customers (1 inactive).
- 12 purchases (9 received, 2 draft, 1 cancelled) and 23 orders (18 delivered, 2 confirmed, 2 draft, 1 cancelled), 21 payments, 6 adjustments.
- 1–23 Oct: ₹2,12,190 sales vs ₹2,24,920 collected; ₹2,06,000 purchases vs ₹3,46,550 paid to suppliers.
- Customers owe ₹1,40,440 (₹45,040 overdue); you owe suppliers ₹2,03,950 (₹26,600 overdue). Stock is worth ₹7,69,740 at cost.
- Draft SO-1023 asks for 12 boxes of coffee with 9 in stock, so confirming it shows the not-enough-stock message.

Not in this demo: tax or GST, discounts, invoices or accounting, returns or credit notes, multiple warehouses, batch or expiry tracking, barcode scanning, delivery routes, reminders or messages, payment gateways, logins.

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

- All ten products (Business Analytics, Invoice & Payment Tracker, Simple CRM, Tasks & Follow-ups, Leave & Attendance, Water Delivery Management, Gym Membership Management, Salon Management, Tuition Centre Management and Small Distributor Management) are labelled **In development**, not live, even though their demos work.
- The inquiry form does not send anything yet and says so on the form and the confirmation page.
- The privacy page is marked as a draft that needs review before launch.
- No trademark or domain clearance has been checked for the name “Vixidia”.
