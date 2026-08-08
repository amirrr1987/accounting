# HesabYar (حساب‌یار)

Simple Persian accounting desktop app — Tauri + Vue + NestJS.

## Stack

- **Desktop**: Tauri v2 + Vue 3.5 + PrimeVue v4 + Tailwind CSS v3.4
- **Server**: NestJS v10 + Zod + Prisma + PostgreSQL 16
- **Shared**: Zod schemas (`packages/shared`)
- **Monorepo**: pnpm workspaces + Turborepo

## Prerequisites

- Node.js 20+
- pnpm 9+
- Rust (for Tauri)
- Docker (PostgreSQL) یا PostgreSQL 16 محلی

## Setup

```bash
pnpm install
pnpm --filter @hesabyar/shared build

# دیتابیس (پورت 15432 — چون 5432 معمولاً توسط Postgres ویندوز اشغال است)
docker compose up -d
pnpm --filter @hesabyar/server exec prisma migrate deploy
pnpm --filter @hesabyar/server prisma:seed
# کاربر پیش‌فرض: admin / admin
```

## Dev commands

```bash
# API (http://localhost:3100)
pnpm dev:server

# Desktop (Tauri) — Vite روی :1420 با proxy به API
pnpm dev:desktop

# هر دو با هم (پورت API پیش‌فرض 3100 است تا با اپ‌های دیگر روی :3000 تداخل نکند)
pnpm dev

# Tests / typecheck
pnpm test
pnpm typecheck
```

## Installer (Windows)

```bash
# خروجی NSIS (.exe) و MSI در apps/desktop/src-tauri/target/release/bundle/
pnpm build:installer
```

Requires Rust toolchain + WebView2 (Windows).

## API

- `POST /auth/login` → `{ accessToken, user }` (پیش‌فرض: `admin` / `admin`)
- `GET /auth/me` → کاربر جاری (نیاز به Bearer token)
- `GET /health` → `{ status, version }` (عمومی)
- سایر endpointها نیاز به `Authorization: Bearer <token>` دارند
- `GET /dashboard` → خلاصه داشبورد (تعدادها + تراز + آخرین اسناد/فاکتورها)
- `GET /accounts` · `GET /accounts/tree?search=`
- `POST /accounts` · `PATCH /accounts/:id` · `DELETE /accounts/:id`
- `GET /vouchers` · `POST /vouchers` (سند متوازن اجباری)
- `GET /ledger?accountId=&fromJalali=&toJalali=`
- `GET /trial-balance?asOfJalali=`
- `GET /parties` · `POST /parties` · `PATCH /parties/:id` · `DELETE /parties/:id`
- `GET /products` · `POST /products` · `PATCH /products/:id` · `DELETE /products/:id`
- `GET /invoices` · `POST /invoices` · `POST /invoices/preview` · `DELETE /invoices/:id` (soft-delete + reverse voucher)
- `GET /reports/profit-loss` · `GET /reports/balance-sheet` · `GET /reports/party-statement` · `GET /reports/vat`
- `GET /reports/cash-flow` · `GET /reports/checks` · `GET /reports/inventory-kardex` · `GET /reports/owner-status`
- `GET /expenses` · `POST /expenses` · `GET /expense-categories` · `GET /owner-drawings` · `POST /owner-drawings`
- `GET /checks` · `POST /checks` · `GET /checks/summary`
- `GET /settings/business` · `PATCH /settings/business`

## Phases (11–18)

| Phase | Feature |
|-------|---------|
| 11 | Units of measure (UOM) |
| 12 | Currency display (pending) |
| 13 | Stock control + sale loss |
| 14 | Bank accounts + payment methods |
| 15 | Sayyad checks |
| 16 | Partners + split inventory (pending) |
| 17 | Expenses + owner drawings + weight adjustment |
| 18 | Management dashboard + integrated reports |


```
apps/desktop   # Tauri + Vue
apps/server    # NestJS + Prisma
packages/shared # Zod schemas + COA seed
```

See `CURSOR_RULES.md` for phases.
