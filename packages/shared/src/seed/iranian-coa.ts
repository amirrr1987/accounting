/**
 * سرفصل حساب‌های استاندارد ایران (~۳۰ حساب)
 * ساختار: گروه → کل → معین → تفصیلی
 */
export type SeedAccount = {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  nature: "DEBIT" | "CREDIT";
  level: "GROUP" | "TOTAL" | "SUBTOTAL" | "DETAIL";
  parentCode: string | null;
};

export const IRANIAN_COA_SEED: SeedAccount[] = [
  // ——— دارایی‌ها ———
  { code: "1", name: "دارایی‌ها", type: "ASSET", nature: "DEBIT", level: "GROUP", parentCode: null },
  { code: "11", name: "دارایی‌های جاری", type: "ASSET", nature: "DEBIT", level: "TOTAL", parentCode: "1" },
  { code: "111", name: "موجودی نقد و بانک", type: "ASSET", nature: "DEBIT", level: "SUBTOTAL", parentCode: "11" },
  { code: "11101", name: "صندوق", type: "ASSET", nature: "DEBIT", level: "DETAIL", parentCode: "111" },
  { code: "11102", name: "تنخواه‌گردان", type: "ASSET", nature: "DEBIT", level: "DETAIL", parentCode: "111" },
  { code: "11103", name: "بانک‌ها", type: "ASSET", nature: "DEBIT", level: "DETAIL", parentCode: "111" },
  { code: "112", name: "حساب‌ها و اسناد دریافتنی", type: "ASSET", nature: "DEBIT", level: "SUBTOTAL", parentCode: "11" },
  { code: "11201", name: "حساب‌های دریافتنی تجاری", type: "ASSET", nature: "DEBIT", level: "DETAIL", parentCode: "112" },
  { code: "11202", name: "اسناد دریافتنی", type: "ASSET", nature: "DEBIT", level: "DETAIL", parentCode: "112" },
  { code: "113", name: "موجودی مواد و کالا", type: "ASSET", nature: "DEBIT", level: "SUBTOTAL", parentCode: "11" },
  { code: "11301", name: "موجودی کالا", type: "ASSET", nature: "DEBIT", level: "DETAIL", parentCode: "113" },
  { code: "12", name: "دارایی‌های غیرجاری", type: "ASSET", nature: "DEBIT", level: "TOTAL", parentCode: "1" },
  { code: "121", name: "دارایی‌های ثابت مشهود", type: "ASSET", nature: "DEBIT", level: "SUBTOTAL", parentCode: "12" },
  { code: "12101", name: "اثاثه و منصوبات", type: "ASSET", nature: "DEBIT", level: "DETAIL", parentCode: "121" },
  { code: "12102", name: "وسایل نقلیه", type: "ASSET", nature: "DEBIT", level: "DETAIL", parentCode: "121" },

  // ——— بدهی‌ها ———
  { code: "2", name: "بدهی‌ها", type: "LIABILITY", nature: "CREDIT", level: "GROUP", parentCode: null },
  { code: "21", name: "بدهی‌های جاری", type: "LIABILITY", nature: "CREDIT", level: "TOTAL", parentCode: "2" },
  { code: "211", name: "حساب‌ها و اسناد پرداختنی", type: "LIABILITY", nature: "CREDIT", level: "SUBTOTAL", parentCode: "21" },
  { code: "21101", name: "حساب‌های پرداختنی تجاری", type: "LIABILITY", nature: "CREDIT", level: "DETAIL", parentCode: "211" },
  { code: "21102", name: "اسناد پرداختنی", type: "LIABILITY", nature: "CREDIT", level: "DETAIL", parentCode: "211" },
  { code: "212", name: "مالیات پرداختنی", type: "LIABILITY", nature: "CREDIT", level: "SUBTOTAL", parentCode: "21" },
  { code: "21201", name: "مالیات بر ارزش افزوده", type: "LIABILITY", nature: "CREDIT", level: "DETAIL", parentCode: "212" },

  // ——— حقوق صاحبان سهام ———
  { code: "3", name: "حقوق صاحبان سهام", type: "EQUITY", nature: "CREDIT", level: "GROUP", parentCode: null },
  { code: "31", name: "سرمایه", type: "EQUITY", nature: "CREDIT", level: "TOTAL", parentCode: "3" },
  { code: "311", name: "سرمایه پرداخت‌شده", type: "EQUITY", nature: "CREDIT", level: "SUBTOTAL", parentCode: "31" },
  { code: "31101", name: "سرمایه", type: "EQUITY", nature: "CREDIT", level: "DETAIL", parentCode: "311" },
  { code: "32", name: "سود و زیان انباشته", type: "EQUITY", nature: "CREDIT", level: "TOTAL", parentCode: "3" },
  { code: "321", name: "سود انباشته", type: "EQUITY", nature: "CREDIT", level: "SUBTOTAL", parentCode: "32" },
  { code: "32101", name: "سود (زیان) انباشته", type: "EQUITY", nature: "CREDIT", level: "DETAIL", parentCode: "321" },

  // ——— درآمدها ———
  { code: "4", name: "درآمدها", type: "INCOME", nature: "CREDIT", level: "GROUP", parentCode: null },
  { code: "41", name: "درآمد عملیاتی", type: "INCOME", nature: "CREDIT", level: "TOTAL", parentCode: "4" },
  { code: "411", name: "فروش", type: "INCOME", nature: "CREDIT", level: "SUBTOTAL", parentCode: "41" },
  { code: "41101", name: "فروش کالا و خدمات", type: "INCOME", nature: "CREDIT", level: "DETAIL", parentCode: "411" },
  { code: "41102", name: "درآمد پورسانت خرید", type: "INCOME", nature: "CREDIT", level: "DETAIL", parentCode: "411" },

  // ——— هزینه‌ها ———
  { code: "5", name: "هزینه‌ها", type: "EXPENSE", nature: "DEBIT", level: "GROUP", parentCode: null },
  { code: "51", name: "بهای تمام‌شده و هزینه‌های عملیاتی", type: "EXPENSE", nature: "DEBIT", level: "TOTAL", parentCode: "5" },
  { code: "511", name: "هزینه‌های عمومی و اداری", type: "EXPENSE", nature: "DEBIT", level: "SUBTOTAL", parentCode: "51" },
  { code: "51101", name: "حقوق و دستمزد", type: "EXPENSE", nature: "DEBIT", level: "DETAIL", parentCode: "511" },
  { code: "51102", name: "اجاره محل", type: "EXPENSE", nature: "DEBIT", level: "DETAIL", parentCode: "511" },
  { code: "51103", name: "آب، برق و گاز", type: "EXPENSE", nature: "DEBIT", level: "DETAIL", parentCode: "511" },
  { code: "51104", name: "پورسانت فروش", type: "EXPENSE", nature: "DEBIT", level: "DETAIL", parentCode: "511" },
  { code: "512", name: "بهای تمام‌شده", type: "EXPENSE", nature: "DEBIT", level: "SUBTOTAL", parentCode: "51" },
  { code: "51201", name: "بهای تمام‌شده کالای فروش رفته", type: "EXPENSE", nature: "DEBIT", level: "DETAIL", parentCode: "512" },
  { code: "51202", name: "زیان فروش زیر بهای تمام‌شده", type: "EXPENSE", nature: "DEBIT", level: "DETAIL", parentCode: "512" },
  { code: "51203", name: "کسری بار / کسری انبار", type: "EXPENSE", nature: "DEBIT", level: "DETAIL", parentCode: "512" },
  { code: "41103", name: "درآمد اضافه بار / اضافه انبار", type: "INCOME", nature: "CREDIT", level: "DETAIL", parentCode: "411" },
];
