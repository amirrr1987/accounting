export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: "دارایی",
  LIABILITY: "بدهی",
  EQUITY: "حقوق صاحبان سهام",
  INCOME: "درآمد",
  EXPENSE: "هزینه",
};

export const ACCOUNT_NATURE_LABELS: Record<string, string> = {
  DEBIT: "بدهکار",
  CREDIT: "بستانکار",
};

export const ACCOUNT_LEVEL_LABELS: Record<string, string> = {
  GROUP: "گروه",
  TOTAL: "کل",
  SUBTOTAL: "معین",
  DETAIL: "تفصیلی",
};

export const ACCOUNT_TYPE_SEVERITY: Record<
  string,
  "success" | "danger" | "info" | "warn" | "secondary"
> = {
  ASSET: "info",
  LIABILITY: "warn",
  EQUITY: "secondary",
  INCOME: "success",
  EXPENSE: "danger",
};
