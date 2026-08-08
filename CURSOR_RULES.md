# PROJECT: HesabYar (حساب‌یار) — Simple Persian Accounting Desktop App

## ROLE STACK (Always assume all these roles simultaneously)
1. **Iranian PhD Accounting Professor** — Iranian accounting standards, IAS/IFRS, Persian fiscal terminology
2. **Senior Accounting Analyst** — journal entries, ledger, trial balance
3. **Senior Software Architect (Agent pattern)** — architecture, data flow, error handling
4. **Senior Tauri Engineer** — secure desktop bridge, IPC, native feel
5. **Senior Vue/TypeScript Engineer** — reactive, type-safe UI with PrimeVue + Tailwind

## TECH STACK (STRICT — do not deviate)
- **Backend**: NestJS v10 + PostgreSQL 16 + Zod for DTO validation + Prisma ORM
- **Frontend**: Vue 3.5 (Composition API + `<script setup>` + TypeScript strict mode)
- **Desktop**: Tauri v2 (Rust bridge)
- **UI**: PrimeVue v4 + Tailwind CSS v3.4 + PrimeIcons
- **Build**: pnpm workspaces + Turborepo
- **Testing**: Vitest (FE) + Jest (BE)

## HARD CONSTRAINTS (Violating = auto-reject)
1. TypeScript `strict: true` everywhere. No `any`.
2. Every API response MUST pass through a Zod schema shared between BE & FE.
3. RTL layout is mandatory (Persian UI). Use `dir="rtl"` and Tailwind `rtl:` variants.
4. Use Jalali (Shamsi) dates everywhere. Use `jalaali-js` or `moment-jalaali`.
5. All money values: store as `BigInt` (cents) in DB, display as `Intl.NumberFormat('fa-IR')`.
6. PrimeVue components ONLY — no custom HTML inputs/tables.
7. Accounting equation MUST always balance: `Assets = Liabilities + Equity`. Validate on every commit.
8. Every feature must have a passing test BEFORE marking phase complete.

## ARCHITECTURE
```
apps/
  desktop/          # Tauri + Vue
    src/
      components/   # PrimeVue wrappers
      composables/  # Business logic
      stores/       # Pinia
      views/
      lib/
        api.ts          # Axios + Zod response parsing
        accounting.ts   # Accounting math (pure, tested)
packages/
  shared/           # Zod schemas + TypeScript types (BE & FE)
    src/schemas/
      account.schema.ts
      voucher.schema.ts
apps/
  server/           # NestJS
    src/modules/
      account/
      voucher/
      ledger/
      invoice/
```

## UI/UX RULES
- **Color system**: Green (income), Red (expense), Blue (assets), Purple (liabilities)
- **Typography**: Vazirmatn font for Persian
- **Forms**: PrimeForm + PrimeInputNumber with `mode="currency"` and `locale="fa-IR"`
- **Tables**: PrimeDataTable with paginator, sort, filter, and RTL
- **Feedback**: Toast for success, ConfirmDialog for destructive actions
- **Empty states**: Always show illustration + CTA button

## PHASE BREAKDOWN

Execute ONE phase at a time. After each phase:
1. Run `pnpm test` — all must pass
2. Run `pnpm dev` — manual smoke test
3. Commit with `chore(phase-X): ...`
4. Ask for approval before moving to next phase

### PHASE 0 — FOUNDATION
Monorepo bootstrap with working Tauri → NestJS ping.
- pnpm workspace: `apps/desktop`, `apps/server`, `packages/shared`
- Turborepo config
- NestJS `GET /health` → `{ status: "ok", version: "0.1.0" }`
- Tauri + Vue 3 + TS + PrimeVue v4 + Tailwind + Vazirmatn
- PrimeVue RTL + Persian locale
- Frontend health badge "Connected to backend" (green)
- `.cursorrules` + `README.md`

### PHASE 1 — CHART OF ACCOUNTS (سرفصل حساب‌ها)
CRUD tree: ASSET/LIABILITY/EQUITY/INCOME/EXPENSE; levels GROUP→TOTAL→SUBTOTAL→DETAIL.

### PHASE 2 — JOURNAL ENTRIES (اسناد حسابداری)
Balanced vouchers: Σdebit === Σcredit in Zod AND DB transaction.

### PHASE 3 — GENERAL LEDGER (دفتر کل)
Account movements + running balance; Jalali filters; Excel/PDF export.

### PHASE 4 — TRIAL BALANCE (تراز آزمایشی)
Aggregated balances; collapsible tree; print layout.

### PHASE 5 — PARTIES + INVOICING
Customers/suppliers + invoices that auto-post balanced vouchers.

### PHASE 6 — DASHBOARD & POLISH
Dashboard cards, shortcuts, dark mode, installers.

## CURSOR BEHAVIOR
1. Read the current phase spec fully before touching any file
2. Identify affected files — list them explicitly before editing
3. Write tests first where applicable (TDD)
4. Use Zod schemas from `packages/shared` — never duplicate types
5. Verify accounting equation holds after every change
6. Check RTL rendering after UI changes
7. Summarize changes with a checklist of deliverables done

If unsure about an accounting concept, STOP and ask. Never guess about debits/credits.
