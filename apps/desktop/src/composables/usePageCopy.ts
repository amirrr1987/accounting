import { computed } from "vue";
import { useExperienceMode } from "@/composables/useExperienceMode";
import { useIsMobileRef } from "@/composables/useViewport";
import { ux } from "@/locale/ux-copy";

export type PageCopyKey =
  | "invoices"
  | "payments"
  | "parties"
  | "products"
  | "reports"
  | "vouchers"
  | "checks"
  | "expenses"
  | "partners"
  | "settings"
  | "accounts"
  | "ledger"
  | "trialBalance"
  | "bankAccounts"
  | "units"
  | "fiscal"
  | "weightAdjustments";

type PageCopy = {
  title: string;
  titleSimple: string;
  subtitle: string;
  subtitleSimple: string;
  hint: string;
};

const PAGE_COPY: Record<PageCopyKey, PageCopy> = {
  invoices: {
    title: ux.invoices.title,
    titleSimple: ux.nav.invoicesSimple,
    subtitle: ux.invoices.subtitle,
    subtitleSimple: ux.pageHints.invoices,
    hint: ux.pageHints.invoices,
  },
  payments: {
    title: ux.payments.title,
    titleSimple: ux.nav.paymentsSimple,
    subtitle: ux.payments.subtitle,
    subtitleSimple: ux.pageHints.payments,
    hint: ux.pageHints.payments,
  },
  parties: {
    title: ux.parties.title,
    titleSimple: ux.nav.partiesSimple,
    subtitle: ux.parties.subtitle,
    subtitleSimple: ux.pageHints.parties,
    hint: ux.pageHints.parties,
  },
  products: {
    title: ux.products.title,
    titleSimple: ux.nav.productsSimple,
    subtitle: ux.products.subtitle,
    subtitleSimple: ux.pageHints.products,
    hint: ux.pageHints.products,
  },
  reports: {
    title: ux.reports.title,
    titleSimple: ux.nav.reportsSimple,
    subtitle: ux.reports.subtitle,
    subtitleSimple: ux.pageHints.reports,
    hint: ux.pageHints.reports,
  },
  vouchers: {
    title: ux.vouchers.title,
    titleSimple: ux.nav.vouchersSimple,
    subtitle: ux.vouchers.subtitle,
    subtitleSimple: ux.pageHints.vouchers,
    hint: ux.pageHints.vouchers,
  },
  checks: {
    title: ux.nav.checks,
    titleSimple: ux.nav.checksSimple,
    subtitle: ux.navHints.checks,
    subtitleSimple: ux.navHints.checks,
    hint: ux.navHints.checks,
  },
  expenses: {
    title: ux.nav.expenses,
    titleSimple: ux.nav.expensesSimple,
    subtitle: ux.navHints.expenses,
    subtitleSimple: ux.navHints.expenses,
    hint: ux.navHints.expenses,
  },
  partners: {
    title: ux.nav.partners,
    titleSimple: ux.nav.partnersSimple,
    subtitle: ux.navHints.partners,
    subtitleSimple: ux.navHints.partners,
    hint: ux.navHints.partners,
  },
  settings: {
    title: ux.settings.title,
    titleSimple: ux.nav.settingsSimple,
    subtitle: ux.settings.subtitle,
    subtitleSimple: ux.navHints.settings,
    hint: ux.navHints.settings,
  },
  accounts: {
    title: ux.nav.accounts,
    titleSimple: ux.nav.accountsSimple,
    subtitle: ux.navHints.accounts,
    subtitleSimple: ux.pageHints.accounts,
    hint: ux.pageHints.accounts,
  },
  ledger: {
    title: ux.nav.ledger,
    titleSimple: ux.nav.ledgerSimple,
    subtitle: ux.navHints.ledger,
    subtitleSimple: ux.pageHints.ledger,
    hint: ux.pageHints.ledger,
  },
  trialBalance: {
    title: ux.trialBalance.title,
    titleSimple: ux.nav.trialBalanceSimple,
    subtitle: ux.trialBalance.subtitle,
    subtitleSimple: ux.pageHints.trialBalance,
    hint: ux.pageHints.trialBalance,
  },
  bankAccounts: {
    title: ux.nav.bankAccounts,
    titleSimple: ux.nav.bankAccountsSimple,
    subtitle: ux.navHints.bankAccounts,
    subtitleSimple: ux.pageHints.bankAccounts,
    hint: ux.pageHints.bankAccounts,
  },
  units: {
    title: ux.nav.units,
    titleSimple: ux.nav.unitsSimple,
    subtitle: ux.navHints.units,
    subtitleSimple: ux.pageHints.units,
    hint: ux.pageHints.units,
  },
  fiscal: {
    title: ux.nav.fiscal,
    titleSimple: ux.nav.fiscalSimple,
    subtitle: ux.navHints.fiscal,
    subtitleSimple: ux.pageHints.fiscal,
    hint: ux.pageHints.fiscal,
  },
  weightAdjustments: {
    title: ux.nav.weightAdjustments,
    titleSimple: ux.nav.weightAdjustmentsSimple,
    subtitle: ux.navHints.weightAdjustments,
    subtitleSimple: ux.pageHints.weightAdjustments,
    hint: ux.pageHints.weightAdjustments,
  },
};

export function usePageCopy(key: PageCopyKey) {
  const { isSimple } = useExperienceMode();
  const isMobile = useIsMobileRef();

  const copy = computed(() => {
    const c = PAGE_COPY[key];
    const plain = isSimple.value || isMobile.value;
    return {
      title: plain ? c.titleSimple : c.title,
      subtitle: plain ? c.subtitleSimple : c.subtitle,
      hint: c.hint,
    };
  });

  return { copy, isMobile };
}
