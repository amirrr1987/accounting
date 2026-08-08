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
  if (!fiscal) return;

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
    oldQty * Number(oldCost) + addQty * Number(addUnitPrice);
  return BigInt(Math.round(total / newQty));
}

/** COGS یک ردیف فروش */
export function lineCogsCost(quantity: number, unitCost: bigint): bigint {
  return unitCost * BigInt(quantity);
}
