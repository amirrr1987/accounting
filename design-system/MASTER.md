# HesabYar Design System (MASTER)

> Generated from ui-ux-pro-max data (Invoice & Billing + Banking/Finance + Vue stack).
> Python CLI unavailable on host — rules applied manually from skill CSVs.

## Product
- **Type**: Persian RTL accounting desktop (Tauri + Vue) — cross-platform window sizes
- **Audience**: Small-business owners, bookkeepers — trust & accuracy first
- **Pattern**: Financial Dashboard + Minimalism + Accessible & Ethical

## Voice (UX Writing)
| Trait | Do | Don't |
|-------|-----|-------|
| دقیق | «جمع بدهکار با بستانکار برابر نیست» | «خطا!» |
| راهنما | بگو قدم بعدی چیست | فقط مشکل را اعلام کن |
| محترمانه | «لطفاً دوباره تلاش کنید» | لحن دستوری تند |
| کوتاه | فعل + مفعول در دکمه‌ها | «کلیک کنید برای…» |

**CTA pattern:** ثبت سند · فاکتور جدید · ورود به حساب  
**Empty pattern:** چه چیزی خالی است + چرا مهم است + یک CTA  
**Error pattern:** چه شد + چه کنید

## Color tokens (Invoice & Billing / Banking)
| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--hy-primary` | `#1E3A5F` | `#93C5FD` | Brand / primary actions |
| `--hy-accent` | `#059669` | `#34D399` | Success / paid / balanced |
| `--hy-danger` | `#DC2626` | `#F87171` | Errors / unbalanced |
| `--hy-surface` | `#FFFFFF` | `#0F172A` | Cards |
| `--hy-bg` | `#F8FAFC` | `#020617` | Page background |
| `--hy-text` | `#0F172A` | `#F8FAFC` | Primary text |
| `--hy-muted` | `#64748B` | `#94A3B8` | Secondary text |
| `--hy-border` | `#E2E8F0` | `#334155` | Dividers |

Avoid: purple gradients, emoji-as-icons, placeholder-only labels.

## Typography
- **UI**: Vazirmatn (already loaded)
- Hierarchy: page title 28–32 / section 18–20 / body 14–16 / meta 12–13
- Line length: max ~68ch for helper copy

## Layout (cross-platform)
- Spacing rhythm: 8 / 16 / 24 / 32
- Content max-width: `72rem` desktop, full width + 16px gutters on narrow
- Touch targets ≥ 44×44px
- Nav: Menubar ≥ `lg`; Drawer + bottom-safe padding on smaller widths
- Motion: 150–300ms; respect `prefers-reduced-motion`

## Anti-patterns
- Silent failures / toast-only without field context on forms
- Dense first viewport with competing stats (keep hierarchy)
- Color-only status (always pair with text/icon)
