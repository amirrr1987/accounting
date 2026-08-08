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
  | "settings";

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
