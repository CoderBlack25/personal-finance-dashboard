# Plan: Sidebar + View Switching UI

**Goal:** Replace the current single-column, randomly-colored layout with a sidebar navigation + view-switching layout using the existing design system (oklch tokens, Geist font, shadcn `Button`).

## Decisions (confirmed)

| Decision | Choice |
|---|---|
| Layout | Sidebar nav (left) + main content area (right) |
| Sidebar nav links | Dashboard, Transactions, Summary |
| Sidebar accounts | Accounts list for selection + "+ Add account" button |
| AccountForm placement | Inline in sidebar under accounts section |
| Category creation UI | Deferred (store has `createCategory`, no component yet) |
| Views | Dashboard (AccountsOverview + AccountBalance), Transactions (TransactionForm + TransactionList), Summary (MonthlySummary) |
| Styling source | Existing `index.css` oklch tokens + Geist Variable font; reuse `src/components/ui/button.tsx` |

## Current state (inspected)

- `src/App.tsx:35` — `<main className="bg-black min-h-screen px-20">` overrides the theme; hardcodes black
- `AccountForm.tsx:45` — `bg-amber-300`; `AccountBalance.tsx:14` — `bg-pink-300`; `TransactionForm.tsx:56` — `bg-blue-400`; `TransactionList.tsx:110` — `bg-green-700`; `EditTransactionForm.tsx:64` — `bg-red-500` — random clashing bg colors
- Everything stacked in one column, no cards/grouping/spacing consistency, no navigation
- `index.css` defines full oklch design system + Geist Variable font already
- `src/components/ui/button.tsx` — shadcn-style `Button` primitive exists but is unused by finance components
- Store: `selectedAccountId`, `accounts`, `allTransactions`, `categories` available; `loadAllTransactions` added previously

## Implementation tasks (ordered)

### 1. Create shared layout shell
File: `src/components/layout/Shell.tsx` (new)
- `<main>` wrapper using theme background (`bg-background` / `text-foreground`) instead of `bg-black`
- Left sidebar (`<aside>`): fixed width, sectioned (nav + accounts + add account)
- Main content area: scrollable, padded
- No changes to component behavior here — purely layout

### 2. Create nav + account list sidebar component
File: `src/components/layout/Sidebar.tsx` (new)
- Nav links: Dashboard / Transactions / Summary — highlight active view
- Accounts section: clickable list of all accounts from store; highlight selected account
- "+ Add account" button: toggles AccountForm visibility inline below accounts
- Read `accounts`, `selectedAccountId`, `selectAccount` from store

### 3. Refactor App.tsx
File: `src/App.tsx`
- Add view state (`useState`): "dashboard" \| "transactions" \| "summary"
- Render `Sidebar` + main content area
- Switch content by view state:
  - dashboard → `<AccountsOverview />` + `<AccountBalance />`
  - transactions → `<TransactionForm />` + `<TransactionList />`
  - summary → `<MonthlySummary />`
- Keep loadAccounts / loadAllTransactions data loading
- Remove all inline random `bg-*` colors from `main`

### 4. Strip random background colors from all components
Remove hardcoded `bg-*` classes and replace with theme-appropriate classes:
- `AccountForm.tsx` — `bg-amber-300` → card/surface class
- `AccountBalance.tsx` — `bg-pink-300` → remove, use text styling
- `TransactionForm.tsx` — `bg-blue-400` → card/surface class
- `TransactionList.tsx` — `bg-green-700` → remove (table uses theme borders)
- `EditTransactionForm.tsx` — `bg-red-500` → card/surface class
- `AccountsOverview.tsx` — no bg, add card styling
- `MonthlySummary.tsx` — add card styling for summary cards + chart container

### 5. Add card surface styling
Use existing shadcn tokens (`bg-card`, `border-border`, `rounded-lg`, `p-4`/`p-6`) via `className` on section wrappers. No new CSS needed — `index.css` already defines these.

### 6. Keyboard / accessibility checks (no new code, verify existing)
- AccountForm / TransactionForm already have `aria-invalid`, `aria-describedby`, `role="alert"`
- Sidebar nav links should use `<a>` or role="button" with keyboard activation
- Account list items should be focusable/clickable

## Files to create
- `src/components/layout/Shell.tsx`
- `src/components/layout/Sidebar.tsx`

## Files to modify
- `src/App.tsx` — layout + view switching
- `src/components/accounts/AccountForm.tsx` — remove bg-amber-300, add card class
- `src/components/accounts/AccountBalance.tsx` — remove bg-pink-300
- `src/components/accounts/AccountsOverview.tsx` — add card class
- `src/components/transactions/TransactionForm.tsx` — remove bg-blue-400, add card class
- `src/components/transactions/TransactionList.tsx` — remove bg-green-700
- `src/components/transactions/EditTransactionForm.tsx` — remove bg-red-500, add card class
- `src/components/summary/MonthlySummary.tsx` — add card classes to cards + chart container

## Out of scope (deferred)
- Category creation UI
- List virtualization
- CSV import UI
- Account archive UI

## Validation
- `pnpm run build` — typecheck + production build must pass
- `pnpm vitest run` — all 59 tests must pass (existing tests mock components; Shell/Sidebar are new and untested, which is acceptable for a layout step)
- Manual: click sidebar nav switches views; clicking an account in sidebar changes "Currently adding transactions to" text; "+ Add account" shows/hides AccountForm

## Rollout
- Implement in order above; run build + tests after each task
- No data model changes; purely presentational + navigation wiring