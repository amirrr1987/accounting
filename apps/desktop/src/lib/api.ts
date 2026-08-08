import axios from "axios";
import {
  AccountListSchema,
  AccountSchema,
  AccountTreeSchema,
  HealthResponseSchema,
  InvoiceListSchema,
  InvoiceSchema,
  InvoiceVoucherPreviewSchema,
  UnitListSchema,
  UnitOfMeasureSchema,
  LedgerReportSchema,
  LoginResponseSchema,
  MeResponseSchema,
  PartyListSchema,
  PartySchema,
  ProductListSchema,
  ProductSchema,
  TrialBalanceReportSchema,
  VoucherListSchema,
  VoucherSchema,
  ProfitLossReportSchema,
  BalanceSheetReportSchema,
  PartyStatementReportSchema,
  VatReportSchema,
  CashFlowReportSchema,
  CheckReportSchema,
  InventoryKardexReportSchema,
  OwnerStatusReportSchema,
  DashboardSummarySchema,
  CreateReceiptSchema,
  CreatePaymentSchema,
  WeightAdjustmentListSchema,
  WeightAdjustmentSchema,
  CreateWeightAdjustmentSchema,
  BankAccountListSchema,
  CreateBankAccountSchema,
  BankAccountSchema,
  CheckListSchema,
  CheckSchema,
  CheckSummarySchema,
  CreateCheckSchema,
  UpdateCheckStatusSchema,
  CheckQuerySchema,
  BusinessSettingsSchema,
  UpdateBusinessSettingsSchema,
  ExpenseCategoryListSchema,
  ExpenseListSchema,
  ExpenseSchema,
  ExpenseSummarySchema,
  CreateExpenseSchema,
  OwnerListSchema,
  OwnerSchema,
  CreateOwnerSchema,
  OwnerDrawingListSchema,
  OwnerDrawingSchema,
  CreateOwnerDrawingSchema,
  PartnerListSchema,
  PartnerSchema,
  CreatePartnerSchema,
  UpdatePartnerSchema,
  PartnerBalanceReportSchema,
  OwnershipDashboardSchema,
  PartnerDrawingListSchema,
  PartnerDrawingSchema,
  CreatePartnerDrawingSchema,
  CloseFiscalYearSchema,
  FiscalYearListSchema,
  FiscalYearSchema,
  AuditLogListSchema,
  UserListSchema,
  UserRecordSchema,
  CreateUserSchema,
  UpdateUserSchema,
  BackupSnapshotSchema,
  RestoreResultSchema,
  type Account,
  type BalanceSheetReport,
  type CloseFiscalYearInput,
  type CreatePaymentInput,
  type CreateReceiptInput,
  type FiscalYear,
  type PartyStatementReport,
  type ProfitLossReport,
  type VatReport,
  type CashFlowReport,
  type CheckReport,
  type InventoryKardexReport,
  type OwnerStatusReport,
  type AccountTreeNode,
  type CreateAccountInput,
  type CreateInvoiceInput,
  type CreateReturnInvoiceInput,
  type CreatePartyInput,
  type CreateProductInput,
  type CreateUnitInput,
  type CreateVoucherInput,
  type DashboardSummary,
  type HealthResponse,
  type Invoice,
  type InvoiceVoucherPreview,
  type UnitOfMeasure,
  type LedgerQuery,
  type LedgerReport,
  type LoginInput,
  type LoginResponse,
  type MeResponse,
  type Party,
  type Product,
  type TrialBalanceQuery,
  type TrialBalanceReport,
  type UpdateAccountInput,
  type Voucher,
  type AuditLog,
  type UserRecord,
  type CreateUserInput,
  type UpdateUserInput,
  type BackupSnapshot,
  type RestoreResult,
  type WeightAdjustment,
  type CreateWeightAdjustmentInput,
  type BankAccount,
  type CreateBankAccountInput,
  type Check,
  type CheckQuery,
  type CheckSummary,
  type CreateCheckInput,
  type UpdateCheckStatusInput,
  type BusinessSettings,
  type UpdateBusinessSettingsInput,
  type ExpenseCategory,
  type Expense,
  type ExpenseSummary,
  type CreateExpenseInput,
  type Owner,
  type CreateOwnerInput,
  type OwnerDrawing,
  type CreateOwnerDrawingInput,
  type Partner,
  type CreatePartnerInput,
  type UpdatePartnerInput,
  type PartnerBalanceReport,
  type OwnershipDashboard,
  type PartnerDrawing,
  type CreatePartnerDrawingInput,
} from "@hesabyar/shared";
import { useAuth } from "@/composables/useAuth";
import { resolveApiBaseUrl } from "@/lib/api-base";

const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const { getToken } = useAuth();
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login")
    ) {
      const { clearSession } = useAuth();
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export async function login(input: LoginInput): Promise<LoginResponse> {
  const { data } = await api.post<unknown>("/auth/login", input);
  return LoginResponseSchema.parse(data);
}

export async function fetchMe(): Promise<MeResponse> {
  const { data } = await api.get<unknown>("/auth/me");
  return MeResponseSchema.parse(data);
}

/** پینگ بک‌اند و اعتبارسنجی پاسخ با Zod */
export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await api.get<unknown>("/health");
  return HealthResponseSchema.parse(data);
}

export async function fetchAccountTree(
  search?: string,
): Promise<AccountTreeNode[]> {
  const { data } = await api.get<unknown>("/accounts/tree", {
    params: search ? { search } : undefined,
  });
  return AccountTreeSchema.parse(data);
}

export async function fetchAccounts(search?: string): Promise<Account[]> {
  const { data } = await api.get<unknown>("/accounts", {
    params: search ? { search } : undefined,
  });
  return AccountListSchema.parse(data);
}

export async function createAccount(
  input: CreateAccountInput,
): Promise<Account> {
  const { data } = await api.post<unknown>("/accounts", input);
  return AccountSchema.parse(data);
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<Account> {
  const { data } = await api.patch<unknown>(`/accounts/${id}`, input);
  return AccountSchema.parse(data);
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/accounts/${id}`);
}

export async function fetchVouchers(): Promise<Voucher[]> {
  const { data } = await api.get<unknown>("/vouchers");
  return VoucherListSchema.parse(data);
}

export async function fetchVoucher(id: string): Promise<Voucher> {
  const { data } = await api.get<unknown>(`/vouchers/${id}`);
  return VoucherSchema.parse(data);
}

export async function createVoucher(
  input: CreateVoucherInput,
): Promise<Voucher> {
  const payload = {
    dateJalali: input.dateJalali,
    description: input.description,
    lines: input.lines.map((l) => ({
      accountId: l.accountId,
      partyId: l.partyId,
      description: l.description ?? "",
      debit: l.debit.toString(),
      credit: l.credit.toString(),
    })),
  };
  const { data } = await api.post<unknown>("/vouchers", payload);
  return VoucherSchema.parse(data);
}

export async function fetchLedger(query: LedgerQuery): Promise<LedgerReport> {
  const { data } = await api.get<unknown>("/ledger", {
    params: {
      accountId: query.accountId,
      ...(query.fromJalali ? { fromJalali: query.fromJalali } : {}),
      ...(query.toJalali ? { toJalali: query.toJalali } : {}),
    },
  });
  return LedgerReportSchema.parse(data);
}

export async function fetchTrialBalance(
  query: TrialBalanceQuery,
): Promise<TrialBalanceReport> {
  const { data } = await api.get<unknown>("/trial-balance", {
    params: { asOfJalali: query.asOfJalali },
  });
  return TrialBalanceReportSchema.parse(data);
}

export async function fetchParties(kind?: string): Promise<Party[]> {
  const { data } = await api.get<unknown>("/parties", {
    params: kind ? { kind } : undefined,
  });
  return PartyListSchema.parse(data);
}

export async function createParty(input: CreatePartyInput): Promise<Party> {
  const { data } = await api.post<unknown>("/parties", input);
  return PartySchema.parse(data);
}

export async function updateParty(
  id: string,
  input: CreatePartyInput,
): Promise<Party> {
  const { data } = await api.patch<unknown>(`/parties/${id}`, input);
  return PartySchema.parse(data);
}

export async function deleteParty(id: string): Promise<void> {
  await api.delete(`/parties/${id}`);
}

export async function fetchProducts(): Promise<Product[]> {
  const { data } = await api.get<unknown>("/products");
  return ProductListSchema.parse(data);
}

export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const payload = {
    ...input,
    unitPrice: input.unitPrice.toString(),
    costPrice: (input.costPrice ?? 0n).toString(),
  };
  const { data } = await api.post<unknown>("/products", payload);
  return ProductSchema.parse(data);
}

export async function updateProduct(
  id: string,
  input: CreateProductInput,
): Promise<Product> {
  const payload = {
    ...input,
    unitPrice: input.unitPrice.toString(),
    costPrice: (input.costPrice ?? 0n).toString(),
  };
  const { data } = await api.patch<unknown>(`/products/${id}`, payload);
  return ProductSchema.parse(data);
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data } = await api.get<unknown>("/invoices");
  return InvoiceListSchema.parse(data);
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const { data } = await api.get<unknown>(`/invoices/${id}`);
  return InvoiceSchema.parse(data);
}

function invoicePayload(input: CreateInvoiceInput) {
  return {
    kind: input.kind,
    partyId: input.partyId,
    dateJalali: input.dateJalali,
    description: input.description ?? "",
    headerDiscount: (input.headerDiscount ?? 0n).toString(),
    commissionAmount: (input.commissionAmount ?? 0n).toString(),
    commissionRate: input.commissionRate ?? null,
    lines: input.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice.toString(),
      vatRate: l.vatRate,
      discountAmount: (l.discountAmount ?? 0n).toString(),
      unitId: l.unitId ?? null,
    })),
  };
}

export async function previewInvoice(
  input: CreateInvoiceInput,
): Promise<InvoiceVoucherPreview> {
  const { data } = await api.post<unknown>(
    "/invoices/preview",
    invoicePayload(input),
  );
  return InvoiceVoucherPreviewSchema.parse(data);
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<Invoice> {
  const { data } = await api.post<unknown>(
    "/invoices",
    invoicePayload(input),
  );
  return InvoiceSchema.parse(data);
}

export async function softDeleteInvoice(id: string): Promise<Invoice> {
  const { data } = await api.delete<unknown>(`/invoices/${id}`);
  return InvoiceSchema.parse(data);
}

function returnPayload(input: CreateReturnInvoiceInput) {
  return {
    originalInvoiceId: input.originalInvoiceId,
    dateJalali: input.dateJalali,
    returnReason: input.returnReason,
    description: input.description ?? "",
    lines: input.lines,
  };
}

export async function previewReturnInvoice(
  input: CreateReturnInvoiceInput,
): Promise<InvoiceVoucherPreview> {
  const { data } = await api.post<unknown>(
    "/invoices/returns/preview",
    returnPayload(input),
  );
  return InvoiceVoucherPreviewSchema.parse(data);
}

export async function createReturnInvoice(
  input: CreateReturnInvoiceInput,
): Promise<Invoice> {
  const { data } = await api.post<unknown>(
    "/invoices/returns",
    returnPayload(input),
  );
  return InvoiceSchema.parse(data);
}

export async function fetchUnits(): Promise<UnitOfMeasure[]> {
  const { data } = await api.get<unknown>("/units");
  return UnitListSchema.parse(data);
}

export async function createUnit(input: CreateUnitInput): Promise<UnitOfMeasure> {
  const { data } = await api.post<unknown>("/units", input);
  return UnitOfMeasureSchema.parse(data);
}

export async function updateUnit(
  id: string,
  input: CreateUnitInput,
): Promise<UnitOfMeasure> {
  const { data } = await api.patch<unknown>(`/units/${id}`, input);
  return UnitOfMeasureSchema.parse(data);
}

export async function fetchDashboard(): Promise<DashboardSummary> {
  const { data } = await api.get<unknown>("/dashboard");
  return DashboardSummarySchema.parse(data);
}

export async function fetchProfitLoss(
  fromJalali: string,
  toJalali: string,
): Promise<ProfitLossReport> {
  const { data } = await api.get<unknown>("/reports/profit-loss", {
    params: { fromJalali, toJalali },
  });
  return ProfitLossReportSchema.parse(data);
}

export async function fetchBalanceSheet(
  asOfJalali: string,
): Promise<BalanceSheetReport> {
  const { data } = await api.get<unknown>("/reports/balance-sheet", {
    params: { asOfJalali },
  });
  return BalanceSheetReportSchema.parse(data);
}

export async function fetchPartyStatement(
  partyId: string,
  fromJalali: string,
  toJalali: string,
): Promise<PartyStatementReport> {
  const { data } = await api.get<unknown>("/reports/party-statement", {
    params: { partyId, fromJalali, toJalali },
  });
  return PartyStatementReportSchema.parse(data);
}

export async function fetchVatReport(
  fromJalali: string,
  toJalali: string,
): Promise<VatReport> {
  const { data } = await api.get<unknown>("/reports/vat", {
    params: { fromJalali, toJalali },
  });
  return VatReportSchema.parse(data);
}

export async function fetchCashFlowReport(
  fromJalali: string,
  toJalali: string,
): Promise<CashFlowReport> {
  const { data } = await api.get<unknown>("/reports/cash-flow", {
    params: { fromJalali, toJalali },
  });
  return CashFlowReportSchema.parse(data);
}

export async function fetchCheckReport(
  fromJalali: string,
  toJalali: string,
): Promise<CheckReport> {
  const { data } = await api.get<unknown>("/reports/checks", {
    params: { fromJalali, toJalali },
  });
  return CheckReportSchema.parse(data);
}

export async function fetchInventoryKardex(
  productId: string,
  fromJalali: string,
  toJalali: string,
): Promise<InventoryKardexReport> {
  const { data } = await api.get<unknown>("/reports/inventory-kardex", {
    params: { productId, fromJalali, toJalali },
  });
  return InventoryKardexReportSchema.parse(data);
}

export async function fetchOwnerStatusReport(
  fromJalali: string,
  toJalali: string,
): Promise<OwnerStatusReport> {
  const { data } = await api.get<unknown>("/reports/owner-status", {
    params: { fromJalali, toJalali },
  });
  return OwnerStatusReportSchema.parse(data);
}

export async function createReceipt(
  input: CreateReceiptInput,
): Promise<Voucher> {
  const payload = CreateReceiptSchema.parse({
    ...input,
    amount: input.amount.toString(),
  });
  const { data } = await api.post<unknown>("/payments/receipt", payload);
  return VoucherSchema.parse(data);
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<Voucher> {
  const payload = CreatePaymentSchema.parse({
    ...input,
    amount: input.amount.toString(),
  });
  const { data } = await api.post<unknown>("/payments/payment", payload);
  return VoucherSchema.parse(data);
}

export async function fetchWeightAdjustments(): Promise<WeightAdjustment[]> {
  const { data } = await api.get<unknown>("/weight-adjustments");
  return WeightAdjustmentListSchema.parse(data);
}

export async function createWeightAdjustment(
  input: CreateWeightAdjustmentInput,
): Promise<WeightAdjustment> {
  const body = CreateWeightAdjustmentSchema.parse(input);
  const { data } = await api.post<unknown>("/weight-adjustments", body);
  return WeightAdjustmentSchema.parse(data);
}

export async function fetchBankAccounts(): Promise<BankAccount[]> {
  const { data } = await api.get<unknown>("/bank-accounts");
  return BankAccountListSchema.parse(data);
}

export async function createBankAccount(
  input: CreateBankAccountInput,
): Promise<BankAccount> {
  const body = CreateBankAccountSchema.parse(input);
  const { data } = await api.post<unknown>("/bank-accounts", body);
  return BankAccountSchema.parse(data);
}

export async function deactivateBankAccount(id: string): Promise<void> {
  await api.patch(`/bank-accounts/${id}/deactivate`);
}

export async function fetchChecks(query?: CheckQuery): Promise<Check[]> {
  const params = query ? CheckQuerySchema.parse(query) : undefined;
  const { data } = await api.get<unknown>("/checks", { params });
  return CheckListSchema.parse(data);
}

export async function fetchCheckSummary(): Promise<CheckSummary> {
  const { data } = await api.get<unknown>("/checks/summary");
  return CheckSummarySchema.parse(data);
}

export async function createCheck(input: CreateCheckInput): Promise<Check> {
  const body = CreateCheckSchema.parse({
    ...input,
    amount: input.amount.toString(),
  });
  const { data } = await api.post<unknown>("/checks", body);
  return CheckSchema.parse(data);
}

export async function updateCheckStatus(
  id: string,
  input: UpdateCheckStatusInput,
): Promise<Check> {
  const body = UpdateCheckStatusSchema.parse(input);
  const { data } = await api.patch<unknown>(`/checks/${id}/status`, body);
  return CheckSchema.parse(data);
}

export async function fetchBusinessSettings(): Promise<BusinessSettings> {
  const { data } = await api.get<unknown>("/settings/business");
  return BusinessSettingsSchema.parse(data);
}

export async function updateBusinessSettings(
  input: UpdateBusinessSettingsInput,
): Promise<BusinessSettings> {
  const body = UpdateBusinessSettingsSchema.parse(input);
  const { data } = await api.patch<unknown>("/settings/business", body);
  return BusinessSettingsSchema.parse(data);
}

export async function fetchFiscalYears(): Promise<FiscalYear[]> {
  const { data } = await api.get<unknown>("/fiscal-years");
  return FiscalYearListSchema.parse(data);
}

export async function closeFiscalYear(
  id: string,
  input: CloseFiscalYearInput,
): Promise<FiscalYear> {
  const body = CloseFiscalYearSchema.parse(input);
  const { data } = await api.post<unknown>(`/fiscal-years/${id}/close`, body);
  return FiscalYearSchema.parse(data);
}

export async function reopenFiscalYear(id: string): Promise<FiscalYear> {
  const { data } = await api.post<unknown>(`/fiscal-years/${id}/reopen`, {});
  return FiscalYearSchema.parse(data);
}

export async function fetchUsers(): Promise<UserRecord[]> {
  const { data } = await api.get<unknown>("/users");
  return UserListSchema.parse(data);
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const body = CreateUserSchema.parse(input);
  const { data } = await api.post<unknown>("/users", body);
  return UserRecordSchema.parse(data);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<UserRecord> {
  const body = UpdateUserSchema.parse(input);
  const { data } = await api.patch<unknown>(`/users/${id}`, body);
  return UserRecordSchema.parse(data);
}

export async function fetchAuditLogs(limit = 50): Promise<AuditLog[]> {
  const { data } = await api.get<unknown>("/audit-logs", { params: { limit } });
  return AuditLogListSchema.parse(data);
}

export async function exportBackup(): Promise<BackupSnapshot> {
  const { data } = await api.get<unknown>("/backup/export");
  return BackupSnapshotSchema.parse(data);
}

export async function restoreBackup(body: BackupSnapshot): Promise<RestoreResult> {
  const payload = BackupSnapshotSchema.parse(body);
  const { data } = await api.post<unknown>("/backup/restore", payload);
  return RestoreResultSchema.parse(data);
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await api.get<unknown>("/expense-categories");
  return ExpenseCategoryListSchema.parse(data);
}

export async function fetchExpenses(): Promise<Expense[]> {
  const { data } = await api.get<unknown>("/expenses");
  return ExpenseListSchema.parse(data);
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const body = CreateExpenseSchema.parse({
    ...input,
    amount: input.amount.toString(),
  });
  const { data } = await api.post<unknown>("/expenses", body);
  return ExpenseSchema.parse(data);
}

export async function fetchExpenseSummary(
  fromJalali: string,
  toJalali: string,
): Promise<ExpenseSummary> {
  const { data } = await api.get<unknown>("/expenses/summary", {
    params: { fromJalali, toJalali },
  });
  return ExpenseSummarySchema.parse(data);
}

export async function fetchOwners(): Promise<Owner[]> {
  const { data } = await api.get<unknown>("/owners");
  return OwnerListSchema.parse(data);
}

export async function createOwner(input: CreateOwnerInput): Promise<Owner> {
  const body = CreateOwnerSchema.parse(input);
  const { data } = await api.post<unknown>("/owners", body);
  return OwnerSchema.parse(data);
}

export async function fetchOwnerDrawings(): Promise<OwnerDrawing[]> {
  const { data } = await api.get<unknown>("/owner-drawings");
  return OwnerDrawingListSchema.parse(data);
}

export async function createOwnerDrawing(
  input: CreateOwnerDrawingInput,
): Promise<OwnerDrawing> {
  const body = CreateOwnerDrawingSchema.parse({
    ...input,
    amount: input.amount.toString(),
  });
  const { data } = await api.post<unknown>("/owner-drawings", body);
  return OwnerDrawingSchema.parse(data);
}

export async function fetchPartners(): Promise<Partner[]> {
  const { data } = await api.get<unknown>("/partners");
  return PartnerListSchema.parse(data);
}

export async function createPartner(input: CreatePartnerInput): Promise<Partner> {
  const body = CreatePartnerSchema.parse(input);
  const { data } = await api.post<unknown>("/partners", body);
  return PartnerSchema.parse(data);
}

export async function updatePartner(
  id: string,
  input: UpdatePartnerInput,
): Promise<Partner> {
  const body = UpdatePartnerSchema.parse(input);
  const { data } = await api.patch<unknown>(`/partners/${id}`, body);
  return PartnerSchema.parse(data);
}

export async function deactivatePartner(id: string): Promise<void> {
  await api.delete(`/partners/${id}`);
}

export async function fetchPartnerBalances(
  fromJalali: string,
  toJalali: string,
): Promise<PartnerBalanceReport> {
  const { data } = await api.get<unknown>("/partners/balances", {
    params: { fromJalali, toJalali },
  });
  return PartnerBalanceReportSchema.parse(data);
}

export async function fetchPartnerOwnership(): Promise<OwnershipDashboard> {
  const { data } = await api.get<unknown>("/partners/ownership");
  return OwnershipDashboardSchema.parse(data);
}

export async function fetchPartnerDrawings(): Promise<PartnerDrawing[]> {
  const { data } = await api.get<unknown>("/partners/drawings");
  return PartnerDrawingListSchema.parse(data);
}

export async function createPartnerDrawing(
  input: CreatePartnerDrawingInput,
): Promise<PartnerDrawing> {
  const body = CreatePartnerDrawingSchema.parse({
    ...input,
    amount: input.amount.toString(),
  });
  const { data } = await api.post<unknown>("/partners/drawings", body);
  return PartnerDrawingSchema.parse(data);
}
