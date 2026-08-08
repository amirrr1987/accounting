import { describe, expect, it } from "vitest";
import { VatReportSchema } from "./report.schema";

describe("VatReportSchema", () => {
  it("parses a balanced VAT summary", () => {
    const report = VatReportSchema.parse({
      fromJalali: "1403/01/01",
      toJalali: "1403/12/29",
      outputVat: "900000",
      inputVat: "450000",
      netPayable: "450000",
      sales: [
        {
          dateJalali: "1403/05/15",
          invoiceNumber: "فاکتور-0001",
          partyName: "مشتری",
          taxableAmount: "10000000",
          vatAmount: "900000",
          total: "10900000",
        },
      ],
      purchases: [],
    });

    expect(report.netPayable).toBe("450000");
    expect(report.sales).toHaveLength(1);
  });
});
