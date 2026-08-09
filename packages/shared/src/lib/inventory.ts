import { compareJalali } from "./jalali";

export type FiscalLockContext = {
  title: string;
  startJalali: string;
  endJalali: string;
  isClosed: boolean;
  closedThroughJalali: string | null;
};

/** بررسی مجاز بودن ثبت سند/فاکتور در تاریخ — پرتاب خطا در صورت قفل */
export function assertFiscalDateWritable(
  dateJalali: string,
  fiscal: FiscalLockContext | null,
): void {
  if (!fiscal) {
    throw new Error("سال مالی فعال تعریف نشده است");
  }

  if (fiscal.isClosed) {
    throw new Error(`سال مالی ${fiscal.title} بسته است و ثبت مجاز نیست`);
  }

  if (
    compareJalali(dateJalali, fiscal.startJalali) < 0 ||
    compareJalali(dateJalali, fiscal.endJalali) > 0
  ) {
    throw new Error(
      `تاریخ ${dateJalali} خارج از سال مالی ${fiscal.title} (${fiscal.startJalali} تا ${fiscal.endJalali}) است`,
    );
  }

  if (
    fiscal.closedThroughJalali &&
    compareJalali(dateJalali, fiscal.closedThroughJalali) <= 0
  ) {
    throw new Error(
      `دوره تا ${fiscal.closedThroughJalali} بسته شده — ثبت در این تاریخ مجاز نیست`,
    );
  }
}

/** میانگین موزون بهای تمام‌شده */
export function weightedAverageCost(
  oldQty: number,
  oldCost: bigint,
  addQty: number,
  addUnitPrice: bigint,
): bigint {
  const newQty = oldQty + addQty;
  if (newQty <= 0) return 0n;
  const total =
    oldCost * BigInt(oldQty) + addUnitPrice * BigInt(addQty);
  return total / BigInt(newQty);
}

/** COGS یک ردیف فروش */
export function lineCogsCost(quantity: number, unitCost: bigint): bigint {
  return unitCost * BigInt(quantity);
}

/** بررسی کافی بودن موجودی — پرتاب خطا در صورت کمبود */
export function assertStockAvailable(
  productName: string,
  stockQty: number,
  requestedQty: number,
): void {
  if (requestedQty > stockQty) {
    throw new Error(
      `موجودی ${productName} (${stockQty}) کمتر از ${requestedQty} است`,
    );
  }
}

/** زیان فروش یک ردیف وقتی درآمد خالص کمتر از بهای تمام‌شده است */
export function calcLineSaleLoss(
  quantity: number,
  unitPrice: bigint,
  costPrice: bigint,
  discountAmount = 0n,
): bigint {
  const lineGross = unitPrice * BigInt(quantity);
  const lineNet = lineGross > discountAmount ? lineGross - discountAmount : 0n;
  const totalCost = lineCogsCost(quantity, costPrice);
  return totalCost > lineNet ? totalCost - lineNet : 0n;
}
