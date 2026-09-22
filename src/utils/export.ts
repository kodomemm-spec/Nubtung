import * as XLSX from "xlsx";
import { CategorySummary, ProfitAndLossReport, Transaction } from "../types";
import { CATEGORIES_CONFIG } from "../data/categories";

// Export the shop's bookkeeping data as a multi-sheet Excel workbook
// (.xlsx), ready to hand to an accountant or drop straight into Google
// Sheets (File > Import). Sheets:
//   1. รายการทั้งหมด        — every transaction, both statements together
//   2. สเตทเม้นท์ธนาคาร      — bank statement only
//   3. สเตทเม้นท์บัตรเครดิต  — credit card statement only
//   4. สรุปงบกำไรขาดทุน      — the P&L summary, for a quick month-end read

const STATEMENT_TYPE_LABEL: Record<Transaction["statementType"], string> = {
  bank: "ธนาคาร",
  credit_card: "บัตรเครดิต",
};

function toTransactionRows(transactions: Transaction[]) {
  return transactions.map((t) => ({
    วันที่: t.date,
    เวลา: t.time || "",
    ประเภท: t.type === "in" ? "เงินเข้า" : "เงินออก",
    "จำนวนเงิน (บาท)": t.amount,
    รายละเอียด: t.description,
    ช่องทาง: t.channel,
    หมวดหมู่บัญชี: t.categoryLabel,
    สเตทเม้นท์: STATEMENT_TYPE_LABEL[t.statementType] || t.statementType,
    เหตุผลของระบบ: t.matchedRule || "",
    สถานะ: t.status === "verified" ? "ตรวจสอบแล้ว" : "รอตรวจสอบ",
  }));
}

function autoFitColumns(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  return headers.map((header) => {
    const longestValue = rows.reduce((max, row) => {
      const value = row[header];
      const len = value === undefined || value === null ? 0 : String(value).length;
      return Math.max(max, len);
    }, header.length);
    return { wch: Math.min(Math.max(longestValue + 2, 10), 48) };
  });
}

function addTransactionSheet(wb: XLSX.WorkBook, sheetName: string, transactions: Transaction[]) {
  const rows = toTransactionRows(transactions);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoFitColumns(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

export function exportTransactionsToExcel(
  transactions: Transaction[],
  pnl: ProfitAndLossReport,
  expenseBreakdown: CategorySummary[]
): void {
  const wb = XLSX.utils.book_new();

  const bankTx = transactions.filter((t) => t.statementType === "bank");
  const creditCardTx = transactions.filter((t) => t.statementType === "credit_card");

  addTransactionSheet(wb, "รายการทั้งหมด", transactions);
  addTransactionSheet(wb, "สเตทเม้นท์ธนาคาร", bankTx);
  addTransactionSheet(wb, "สเตทเม้นท์บัตรเครดิต", creditCardTx);

  // P&L summary sheet
  const summaryRows: { รายการ: string; "จำนวนเงิน (บาท)": number | string }[] = [
    { รายการ: `งวด: ${pnl.period}`, "จำนวนเงิน (บาท)": "" },
    { รายการ: "รายได้รวม (Total Revenue)", "จำนวนเงิน (บาท)": pnl.totalRevenue },
    { รายการ: "ต้นทุนสินค้า (COGS)", "จำนวนเงิน (บาท)": -pnl.cogs },
    { รายการ: "กำไรขั้นต้น (Gross Profit)", "จำนวนเงิน (บาท)": pnl.grossProfit },
    { รายการ: "", "จำนวนเงิน (บาท)": "" },
    { รายการ: "ค่าใช้จ่ายดำเนินงาน แยกตามหมวดหมู่ (Opex Breakdown)", "จำนวนเงิน (บาท)": "" },
    ...expenseBreakdown.map((item) => ({
      รายการ: `- ${CATEGORIES_CONFIG[item.category]?.name || item.label}`,
      "จำนวนเงิน (บาท)": -item.total,
    })),
    { รายการ: "รวมค่าใช้จ่ายดำเนินงาน (Total Opex)", "จำนวนเงิน (บาท)": -pnl.totalOperatingExpenses },
    { รายการ: "", "จำนวนเงิน (บาท)": "" },
    { รายการ: "กำไรสุทธิจากการดำเนินงาน (Net Operating Profit)", "จำนวนเงิน (บาท)": pnl.netOperatingProfit },
    { รายการ: "เงินถอนส่วนตัวเจ้าของ (Owner's Draw)", "จำนวนเงิน (บาท)": -pnl.ownerDraw },
    { รายการ: "กระแสเงินสดคงเหลือสุทธิ (Net Cash Flow)", "จำนวนเงิน (บาท)": pnl.netCashFlow },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  summaryWs["!cols"] = [{ wch: 48 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "สรุปงบกำไรขาดทุน");

  const dateStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `NubTung_บัญชี_${dateStr}.xlsx`);
}
