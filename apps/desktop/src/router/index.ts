import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import AccountsView from "@/views/AccountsView.vue";
import VouchersView from "@/views/VouchersView.vue";
import VoucherFormView from "@/views/VoucherFormView.vue";
import LedgerView from "@/views/LedgerView.vue";
import TrialBalanceView from "@/views/TrialBalanceView.vue";
import PartiesView from "@/views/PartiesView.vue";
import ProductsView from "@/views/ProductsView.vue";
import InvoicesView from "@/views/InvoicesView.vue";
import InvoiceFormView from "@/views/InvoiceFormView.vue";
import LoginView from "@/views/LoginView.vue";
import InvoiceDetailView from "@/views/InvoiceDetailView.vue";
import InvoiceReturnFormView from "@/views/InvoiceReturnFormView.vue";
import UnitsView from "@/views/UnitsView.vue";
import WeightAdjustmentsView from "@/views/WeightAdjustmentsView.vue";
import BankAccountsView from "@/views/BankAccountsView.vue";
import PaymentFormView from "@/views/PaymentFormView.vue";
import ReportsView from "@/views/ReportsView.vue";
import VoucherDetailView from "@/views/VoucherDetailView.vue";
import FiscalYearsView from "@/views/FiscalYearsView.vue";
import SettingsView from "@/views/SettingsView.vue";
import { useAuth } from "@/composables/useAuth";
import { isAdmin } from "@hesabyar/shared";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { public: true },
    },
    { path: "/", name: "home", component: HomeView },
    { path: "/accounts", name: "accounts", component: AccountsView },
    { path: "/vouchers", name: "vouchers", component: VouchersView },
    { path: "/vouchers/new", name: "voucher-new", component: VoucherFormView },
    { path: "/vouchers/:id", name: "voucher-detail", component: VoucherDetailView },
    { path: "/ledger", name: "ledger", component: LedgerView },
    {
      path: "/trial-balance",
      name: "trial-balance",
      component: TrialBalanceView,
    },
    { path: "/parties", name: "parties", component: PartiesView },
    { path: "/products", name: "products", component: ProductsView },
    { path: "/units", name: "units", component: UnitsView },
    { path: "/weight-adjustments", name: "weight-adjustments", component: WeightAdjustmentsView },
    { path: "/bank-accounts", name: "bank-accounts", component: BankAccountsView },
    { path: "/invoices", name: "invoices", component: InvoicesView },
    { path: "/invoices/new", name: "invoice-new", component: InvoiceFormView },
    { path: "/invoices/:id/return", name: "invoice-return", component: InvoiceReturnFormView },
    { path: "/invoices/:id", name: "invoice-detail", component: InvoiceDetailView },
    { path: "/payments/new", name: "payment-new", component: PaymentFormView },
    { path: "/reports", name: "reports", component: ReportsView },
    { path: "/fiscal-years", name: "fiscal-years", component: FiscalYearsView },
    {
      path: "/settings",
      name: "settings",
      component: SettingsView,
      meta: { adminOnly: true },
    },
  ],
});

router.beforeEach((to) => {
  const { isAuthenticated, user } = useAuth();
  if (to.meta.public) {
    if (isAuthenticated.value && to.name === "login") {
      return { name: "home" };
    }
    return true;
  }
  if (!isAuthenticated.value) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.meta.adminOnly && user.value && !isAdmin(user.value.role)) {
    return { name: "home" };
  }
  return true;
});
