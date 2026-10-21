# Plan: Apply Production Design System

**Goal:** Apply the finance dashboard design system (OKLCH tokens, Geist Variable font, @base-ui/react primitives, lucide icons, cva + cn) across all UI components and pages so the app looks consistent, trustworthy, and production-ready in both light and dark modes.

## Decisions (confirmed)

| Decision | Choice |
|----------|--------|
| Styling | Tailwind CSS v4 + CSS variables in `src/index.css`; OKLCH color space |
| Font | Geist Variable (already loaded via `@fontsource-variable/geist`) |
| Primitives | `@base-ui/react` (Button already wrapped; wrap Input, Select, Checkbox, Radio, Popover, Dialog, DropdownMenu, Tooltip) |
| Variant authoring | `cva` + `cn` (existing `button.tsx` pattern) |
| Icons | `lucide-react` (already configured in `components.json`) |
| State/forms | Zustand store + React Hook Form + Zod (unchanged) |
| Charts | Chart.js (already used in MonthlySummary; apply design palette + tooltip styling) |
| Dark mode | Supported via existing `.dark` block in `index.css`; all new tokens must be symmetric |

## Current state (inspected)

- `src/index.css` — defines background/foreground/card/popover/primary/secondary/muted/accent/destructive/border/input/ring/chart-1..5 + radius + sidebar tokens; dark mode block present
- `src/components/ui/button.tsx` — only UI component; uses `@base-ui/react` + `cva` + `cn`
- `src/components/layout/Shell.tsx` + `Sidebar.tsx` — exist (from prior plan), use theme classes but not the full design system
- Page components (`AccountForm`, `TransactionForm`, `TransactionList`, `AccountsOverview`, `AccountBalance`, `CsvImport`, `MonthlySummary`, `EditTransactionForm`) — use inline Tailwind classes, hardcoded `bg-*` colors, inconsistent spacing/radius, no shared component library
- `src/lib/utils.ts` — `cn()` exists (clsx + tailwind-merge)

## Implementation tasks (ordered)

### Phase 1: Foundation tokens (`src/index.css`)
Add missing design-system tokens so every component references the same scale:
- Brand primary (oklch) + primary-foreground for both light/dark
- Shadow tokens: `--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`
- Z-index layers (base/dropdown/sticky/tooltip/popover/modal/toast)
- Ensure `--radius` values and `--font-mono` are present for currency tabular figures

### Phase 2: UI component library (`src/components/ui/`)
Create each component using `@base-ui/react` primitives + `cva` + `cn`, following `button.tsx` conventions:
- `input.tsx` — default/error variants, sm/default sizes, focus ring, aria-invalid
- `select.tsx` — same states as Input
- `textarea.tsx` — same states as Input, vertical resize only
- `checkbox.tsx` — checked state `--primary`, focus ring
- `radio-group.tsx` — checked state `--primary`, inline labels
- `badge.tsx` — default/secondary/destructive/outline, sm/default, `--radius-full` option
- `card.tsx` — default/elevated/interactive variants
- `table.tsx` — header/body styles, `--font-mono` numeric cells, row hover
- `popover.tsx` — trigger + content, `bg-card border border-border shadow-lg`
- `dialog.tsx` — backdrop blur, panel `bg-card border border-border rounded-xl`, close button
- `dropdown-menu.tsx` — items with hover/active states
- `tooltip.tsx` — `bg-foreground text-background`, `--text-xs`
- `skeleton.tsx` — `bg-muted rounded-lg animate-pulse`
- `alert.tsx` — info/success/warning/destructive variants, left icon + dismiss
- `toast.tsx` — toast container + individual toast
- `form.tsx` — `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` composites (RHF + Zod integration)

### Phase 3: Layout refinement (`src/components/layout/`)
- `Shell.tsx` — consistent page padding, sticky sidebar z-index, background tokens
- `Sidebar.tsx` — brand mark, nav links with active state, accounts list with selected highlight, "+ Add account" outline button, consistent spacing/radius

### Phase 4: Page refactoring (use component library)
Refactor each page to use `src/components/ui/` components and design tokens:
- `src/components/accounts/AccountForm.tsx` — Form composites, card surface, consistent field stacks
- `src/components/accounts/AccountBalance.tsx` — card surface, monospace currency
- `src/components/accounts/AccountsOverview.tsx` — card surface, table component, monospace balances
- `src/components/transactions/TransactionForm.tsx` — Form composites, radio-group for type, card surface
- `src/components/transactions/TransactionList.tsx` — filter bar using Input/Select, table component, skeleton/empty states
- `src/components/transactions/CsvImport.tsx` — card surface, file input styling, alert for errors, table component
- `src/components/transactions/EditTransactionForm.tsx` — card surface, inline edit form
- `src/components/summary/MonthlySummary.tsx` — card surfaces, chart palette (`--chart-1..5`), metric cards, tooltip styling

### Phase 5: QA & validation
- `pnpm run build` — typecheck + production build must pass
- `pnpm run lint` — ESLint must pass
- `pnpm vitest run` — all existing tests must pass
- Manual: light/dark toggle parity, keyboard navigation, focus rings, `prefers-reduced-motion` respected, currency alignment in tables

## Files to create

- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/radio-group.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/toast.tsx`
- `src/components/ui/form.tsx`

## Files to modify

- `src/index.css` — add brand primary, shadows, z-index tokens
- `src/components/layout/Shell.tsx` — apply design tokens + consistent spacing
- `src/components/layout/Sidebar.tsx` — apply design tokens + consistent spacing/radius
- `src/components/accounts/AccountForm.tsx` — use form composites + card surface
- `src/components/accounts/AccountBalance.tsx` — card surface + monospace currency
- `src/components/accounts/AccountsOverview.tsx` — card surface + table component
- `src/components/transactions/TransactionForm.tsx` — form composites + card surface
- `src/components/transactions/TransactionList.tsx` — input/select + table + skeleton/empty
- `src/components/transactions/CsvImport.tsx` — card surface + alerts + table
- `src/components/transactions/EditTransactionForm.tsx` — card surface + inline form
- `src/components/summary/MonthlySummary.tsx` — card surfaces + chart palette + metric cards

## Out of scope (deferred)

- Category creation UI (store has `createCategory`, no component yet)
- List virtualization for large transaction sets
- Account archive/delete UI
- Dark mode toggle component (dark mode exists via class; toggle UI deferred)
- Real-time/websocket updates

## Validation

- `pnpm run build` — TypeScript typecheck + Vite production build pass
- `pnpm run lint` — ESLint passes with no errors
- `pnpm vitest run` — existing test suite passes
- Manual checklist:
  - Light and dark mode render with correct contrast (≥4.5:1 normal text)
  - Focus-visible rings on all interactive elements
  - Currency values use `--font-mono` with tabular figures and align in columns
  - Empty states and skeletons appear during loading
  - `prefers-reduced-motion` disables transitions

## Rollout

- Implement in order above; run build + lint + tests after each phase
- No data model or store changes; purely presentational + component wiring
- No commit unless explicitly requested by user