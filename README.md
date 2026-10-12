# Vixidia website

Company website and product catalogue for Vixidia, with a browser-only interactive demo of **Pulse** (business insights and analytics) at `/products/pulse/try` and an interactive sample-data demo of the **Invoice & Payment Tracker** at `/products/invoice-payment-tracker/try`.

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
| `npm test` | Unit tests (product registry, Pulse calculations, inquiry validation) |
| `npm run lint` | ESLint |

## Where things live

```
src/
  app/            App shell, route table, layout, scroll reset
  components/     Shared UI: Button, Header, Footer, Dialog, ProductCard, StatusBadge…
  config/         brand.ts (name, tagline), products.ts (product registry), routes.ts
  data/           pulseSample.ts — the fictional sample business for the demo
  features/
    pulse/        Pulse demo: pure logic (pulseLogic.ts), state hook, dashboard components
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

## The Pulse demo

Pulse is **business insights and analytics**: it shows how a business is performing, not how to run its finances. Invoices, due dates, payments and customer balances belong to the separate Invoice & Payment Tracker.

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

- Pulse is labelled **In development**, not live, even though its demo works. The other four products are planned concepts.
- The inquiry form does not send anything yet and says so on the form and the confirmation page.
- The privacy page is marked as a draft that needs review before launch.
- No trademark or domain clearance has been checked for the name “Vixidia”.
