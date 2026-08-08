import { ux } from "@/locale/ux-copy";

export type NavGroupId =
  | "daily"
  | "money"
  | "people"
  | "inventory"
  | "reports"
  | "advanced"
  | "system";

export type NavItemDef = {
  id: string;
  path: string;
  icon: string;
  simpleLabel: string;
  proLabel: string;
  hint: string;
  group: NavGroupId;
  /** تب پایین موبایل */
  mobilePrimary?: boolean;
  /** فقط در حالت پیشرفته */
  proOnly?: boolean;
};

export const NAV_GROUP_ORDER: NavGroupId[] = [
  "daily",
  "money",
  "people",
  "inventory",
  "reports",
  "advanced",
  "system",
];

export function navGroupMeta(id: NavGroupId): {
  title: string;
  subtitle: string;
} {
  return ux.navGroups[id];
}

export const NAV_ITEMS: NavItemDef[] = [
  {
    id: "home",
    path: "/",
    icon: "pi pi-home",
    simpleLabel: ux.nav.home,
    proLabel: ux.nav.home,
    hint: ux.navHints.home,
    group: "daily",
    mobilePrimary: true,
  },
  {
    id: "invoices",
    path: "/invoices",
    icon: "pi pi-file",
    simpleLabel: ux.nav.invoicesSimple,
    proLabel: ux.nav.invoices,
    hint: ux.navHints.invoices,
    group: "daily",
    mobilePrimary: true,
  },
  {
    id: "payments",
    path: "/payments/new",
    icon: "pi pi-wallet",
    simpleLabel: ux.nav.paymentsSimple,
    proLabel: ux.nav.payments,
    hint: ux.navHints.payments,
    group: "daily",
    mobilePrimary: true,
  },
  {
    id: "reports",
    path: "/reports",
    icon: "pi pi-chart-line",
    simpleLabel: ux.nav.reportsSimple,
    proLabel: ux.nav.reports,
    hint: ux.navHints.reports,
    group: "reports",
    mobilePrimary: true,
  },
  {
    id: "parties",
    path: "/parties",
    icon: "pi pi-users",
    simpleLabel: ux.nav.partiesSimple,
    proLabel: ux.nav.parties,
    hint: ux.navHints.parties,
    group: "people",
  },
  {
    id: "products",
    path: "/products",
    icon: "pi pi-box",
    simpleLabel: ux.nav.productsSimple,
    proLabel: ux.nav.products,
    hint: ux.navHints.products,
    group: "inventory",
  },
  {
    id: "checks",
    path: "/checks",
    icon: "pi pi-money-bill",
    simpleLabel: ux.nav.checksSimple,
    proLabel: ux.nav.checks,
    hint: ux.navHints.checks,
    group: "money",
  },
  {
    id: "bank-accounts",
    path: "/bank-accounts",
    icon: "pi pi-building-columns",
    simpleLabel: ux.nav.bankAccountsSimple,
    proLabel: ux.nav.bankAccounts,
    hint: ux.navHints.bankAccounts,
    group: "money",
  },
  {
    id: "expenses",
    path: "/expenses",
    icon: "pi pi-receipt",
    simpleLabel: ux.nav.expensesSimple,
    proLabel: ux.nav.expenses,
    hint: ux.navHints.expenses,
    group: "money",
  },
  {
    id: "partners",
    path: "/partners",
    icon: "pi pi-share-alt",
    simpleLabel: ux.nav.partnersSimple,
    proLabel: ux.nav.partners,
    hint: ux.navHints.partners,
    group: "people",
  },
  {
    id: "units",
    path: "/units",
    icon: "pi pi-sliders-h",
    simpleLabel: ux.nav.unitsSimple,
    proLabel: ux.nav.units,
    hint: ux.navHints.units,
    group: "inventory",
  },
  {
    id: "weight-adjustments",
    path: "/weight-adjustments",
    icon: "pi pi-percentage",
    simpleLabel: ux.nav.weightAdjustmentsSimple,
    proLabel: ux.nav.weightAdjustments,
    hint: ux.navHints.weightAdjustments,
    group: "inventory",
    proOnly: true,
  },
  {
    id: "vouchers",
    path: "/vouchers",
    icon: "pi pi-book",
    simpleLabel: ux.nav.vouchersSimple,
    proLabel: ux.nav.vouchers,
    hint: ux.navHints.vouchers,
    group: "advanced",
    proOnly: true,
  },
  {
    id: "ledger",
    path: "/ledger",
    icon: "pi pi-list",
    simpleLabel: ux.nav.ledgerSimple,
    proLabel: ux.nav.ledger,
    hint: ux.navHints.ledger,
    group: "advanced",
    proOnly: true,
  },
  {
    id: "trial-balance",
    path: "/trial-balance",
    icon: "pi pi-chart-bar",
    simpleLabel: ux.nav.trialBalanceSimple,
    proLabel: ux.nav.trialBalance,
    hint: ux.navHints.trialBalance,
    group: "advanced",
    proOnly: true,
  },
  {
    id: "accounts",
    path: "/accounts",
    icon: "pi pi-sitemap",
    simpleLabel: ux.nav.accountsSimple,
    proLabel: ux.nav.accounts,
    hint: ux.navHints.accounts,
    group: "advanced",
    proOnly: true,
  },
  {
    id: "fiscal",
    path: "/fiscal-years",
    icon: "pi pi-lock",
    simpleLabel: ux.nav.fiscalSimple,
    proLabel: ux.nav.fiscal,
    hint: ux.navHints.fiscal,
    group: "system",
    proOnly: true,
  },
  {
    id: "settings",
    path: "/settings",
    icon: "pi pi-cog",
    simpleLabel: ux.nav.settingsSimple,
    proLabel: ux.nav.settings,
    hint: ux.navHints.settings,
    group: "system",
  },
];

export type QuickActionDef = {
  id: string;
  label: string;
  hint: string;
  icon: string;
  path: string;
  tone: "primary" | "accent" | "neutral";
};

export const QUICK_ACTIONS: QuickActionDef[] = [
  {
    id: "sale",
    label: ux.quickActions.sale,
    hint: ux.quickActions.saleHint,
    icon: "pi pi-shopping-cart",
    path: "/invoices/new",
    tone: "primary",
  },
  {
    id: "purchase",
    label: ux.quickActions.purchase,
    hint: ux.quickActions.purchaseHint,
    icon: "pi pi-shopping-bag",
    path: "/invoices/new",
    tone: "neutral",
  },
  {
    id: "receipt",
    label: ux.quickActions.receipt,
    hint: ux.quickActions.receiptHint,
    icon: "pi pi-arrow-down-left",
    path: "/payments/new?flow=receipt",
    tone: "accent",
  },
  {
    id: "payment",
    label: ux.quickActions.payment,
    hint: ux.quickActions.paymentHint,
    icon: "pi pi-arrow-up-right",
    path: "/payments/new?flow=payment",
    tone: "neutral",
  },
  {
    id: "party",
    label: ux.quickActions.party,
    hint: ux.quickActions.partyHint,
    icon: "pi pi-user-plus",
    path: "/parties",
    tone: "neutral",
  },
];

export function navLabel(
  item: NavItemDef,
  mode: "simple" | "pro",
): string {
  return mode === "simple" ? item.simpleLabel : item.proLabel;
}

export function visibleNavItems(mode: "simple" | "pro"): NavItemDef[] {
  if (mode === "pro") return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => !item.proOnly);
}

export function groupedNavItems(
  mode: "simple" | "pro",
): Array<{ group: NavGroupId; items: NavItemDef[] }> {
  const items = visibleNavItems(mode);
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((g) => g.items.length > 0);
}

export function mobilePrimaryTabs(): NavItemDef[] {
  return NAV_ITEMS.filter((item) => item.mobilePrimary);
}

export function isNavActive(path: string, currentPath: string): boolean {
  if (path === "/") return currentPath === "/";
  const base = path.split("?")[0] ?? path;
  if (base === "/payments/new") {
    return currentPath.startsWith("/payments");
  }
  return currentPath.startsWith(base);
}
