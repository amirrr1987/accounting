# راهنمای راه‌اندازی حساب‌یار (HesabYar)

این فایل مراحل راه‌اندازی پروژه را روی ویندوز، به‌صورت گام‌به‌گام توضیح می‌دهد.

---

## پیش‌نیازها

قبل از شروع، این ابزارها را نصب کنید:

| ابزار | نسخه پیشنهادی | توضیح |
|--------|----------------|--------|
| Node.js | 20 یا بالاتر | محیط اجرای جاوااسکریپت |
| pnpm | 9 یا بالاتر | مدیریت پکیج مونوریپو |
| Docker Desktop | آخرین نسخه پایدار | برای PostgreSQL |
| Rust | پایدار (stable) | فقط برای اپ دسکتاپ Tauri |
| WebView2 | پیش‌فرض ویندوز ۱۰/۱۱ | برای اجرای Tauri |

### نصب سریع پیش‌نیازها

```bash
# بررسی Node
node -v

# نصب pnpm (اگر ندارید)
npm install -g pnpm@9

# بررسی pnpm
pnpm -v

# بررسی Docker
docker -v

# نصب Rust (در صورت نیاز به دسکتاپ)
# از سایت https://rustup.rs استفاده کنید، سپس:
rustc --version
```

---

## ساختار پروژه (خلاصه)

```
apps/desktop     → اپلیکیشن دسکتاپ (Tauri + Vue)
apps/server      → API سرور (NestJS + Prisma)
packages/shared  → اسکیماهای مشترک Zod
```

---

## مرحله ۱ — کلون و ورود به پروژه

اگر پروژه را از GitHub گرفته‌اید:

```bash
cd D:\Projects\GitHub\accounting
```

---

## مرحله ۲ — نصب وابستگی‌ها

در ریشه پروژه:

```bash
pnpm install
```

سپس پکیج مشترک را بسازید:

```bash
pnpm --filter @hesabyar/shared build
```

---

## مرحله ۳ — تنظیم فایل محیط سرور (`.env`)

فایل نمونه را کپی کنید:

```bash
copy apps\server\.env.example apps\server\.env
```

محتوای پیش‌فرض معمولاً این است:

```env
DATABASE_URL="postgresql://hesabyar:hesabyar@127.0.0.1:15432/hesabyar?schema=public"
PORT=3100
JWT_SECRET="hesabyar-dev-secret-change-me"
```

نکته: پورت دیتابیس `15432` است (نه `5432`)، تا با PostgreSQL ویندوز تداخل نداشته باشد.

---

## مرحله ۴ — بالا آوردن دیتابیس با Docker

Docker Desktop را روشن کنید، سپس:

```bash
pnpm db:up
```

یا معادل آن:

```bash
docker compose up -d
```

برای اطمینان از اجرای کانتینر:

```bash
docker ps
```

باید کانتینر `hesabyar-postgres` را ببینید.

---

## مرحله ۵ — مهاجرت و Seed دیتابیس

اعمال مایگریشن‌ها:

```bash
pnpm --filter @hesabyar/server exec prisma migrate deploy
```

پر کردن داده‌های اولیه (کاربر ادمین و حساب‌ها):

```bash
pnpm db:seed
```

یا:

```bash
pnpm --filter @hesabyar/server prisma:seed
```

### ورود پیش‌فرض

- نام کاربری: `admin`
- رمز عبور: `admin`

---

## مرحله ۶ — اجرای پروژه در حالت توسعه

### گزینه الف — اجرای همزمان سرور و دسکتاپ

```bash
pnpm dev
```

### گزینه ب — اجرای جداگانه (پیشنهادی برای دیباگ)

ترمینال ۱ — API:

```bash
pnpm dev:server
```

آدرس API: `http://localhost:3100`

ترمینال ۲ — دسکتاپ:

```bash
pnpm dev:desktop
```

Vite معمولاً روی پورت `1420` بالا می‌آید و درخواست‌ها را به API پروکسی می‌کند.

### فقط تست API بدون دسکتاپ

اگر فقط سرور لازم دارید، همان `pnpm dev:server` کافی است. سپس در مرورگر یا با ابزارهایی مثل Postman:

```text
GET http://localhost:3100/health
```

باید پاسخی شبیه `{ "status": "...", "version": "..." }` ببینید.

ورود:

```text
POST http://localhost:3100/auth/login
Body: { "username": "admin", "password": "admin" }
```

---

## مرحله ۷ — تست و بررسی سلامت پروژه

```bash
# اجرای تست‌ها
pnpm test

# بررسی تایپ‌ها
pnpm typecheck
```

---

## ساخت نصب‌کننده ویندوز (اختیاری)

برای ساخت فایل نصب (`.exe` / `.msi`):

```bash
pnpm build:installer
```

خروجی معمولاً اینجاست:

```text
apps/desktop/src-tauri/target/release/bundle/
```

نیازمندی‌ها: Rust + WebView2.

---

## دستورات پرکاربرد (جمع‌بندی)

| دستور | کار |
|--------|------|
| `pnpm install` | نصب پکیج‌ها |
| `pnpm db:up` | روشن کردن PostgreSQL با Docker |
| `pnpm db:migrate` | مایگریشن توسعه |
| `pnpm db:seed` | داده اولیه |
| `pnpm dev:server` | اجرای API روی پورت ۳۱۰۰ |
| `pnpm dev:desktop` | اجرای اپ دسکتاپ |
| `pnpm dev` | اجرای هر دو با هم |
| `pnpm test` | اجرای تست‌ها |
| `pnpm build:installer` | ساخت نصب‌کننده ویندوز |

---

## رفع اشکال رایج

### ۱) پورت ۳۱۰۰ یا ۱۵۴۳۲ اشغال است

- API را در `.env` با `PORT` دیگر تنظیم کنید.
- برای دیتابیس، پورت نگاشت‌شده در `docker-compose.yml` را تغییر دهید و همان را در `DATABASE_URL` هم به‌روز کنید.

### ۲) Docker بالا نمی‌آید

- Docker Desktop را کامل اجرا کنید.
- دوباره `pnpm db:up` بزنید.

### ۳) خطای اتصال به دیتابیس

- مطمئن شوید `.env` ساخته شده و پورت `15432` است.
- با `docker ps` وضعیت کانتینر را چک کنید.

### ۴) خطای Tauri / Rust

- Rust را نصب و ترمینال را یک‌بار ببندید و باز کنید.
- WebView2 را به‌روز کنید.

### ۵) بعد از `pnpm install` پکیج shared پیدا نمی‌شود

دوباره بسازید:

```bash
pnpm --filter @hesabyar/shared build
```

---

## ترتیب پیشنهادی از صفر تا اجرا

1. نصب Node، pnpm، Docker (و در صورت نیاز Rust)
2. `pnpm install`
3. `pnpm --filter @hesabyar/shared build`
4. کپی `apps/server/.env.example` → `apps/server/.env`
5. `pnpm db:up`
6. `pnpm --filter @hesabyar/server exec prisma migrate deploy`
7. `pnpm db:seed`
8. `pnpm dev:server` و سپس `pnpm dev:desktop`
9. ورود با `admin` / `admin`

اگر همه مراحل درست باشد، سرور روی `3100` و اپ دسکتاپ آماده کار است.
