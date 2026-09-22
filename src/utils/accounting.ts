import { CATEGORIES_CONFIG } from "../data/categories";
import { AccountingCategory, CategorySummary, ProfitAndLossReport, StatementType, Transaction } from "../types";

export function formatBaht(amount: number, showSign = false): string {
  const formatted = Math.abs(amount).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (showSign) {
    if (amount > 0) return `+${formatted} ฿`;
    if (amount < 0) return `-${formatted} ฿`;
  }
  return `${amount < 0 ? "-" : ""}${formatted} ฿`;
}

export function calculatePnL(transactions: Transaction[], period = "กันยายน 2026"): ProfitAndLossReport {
  let totalRevenue = 0;
  let cogs = 0;
  let totalOperatingExpenses = 0;
  let ownerDraw = 0;

  const opexCategories: Record<AccountingCategory, number> = {
    sales_revenue: 0,
    service_revenue: 0,
    other_income: 0,
    cogs: 0,
    shipping_logistics: 0,
    marketing_ads: 0,
    utilities_rent: 0,
    salary_wage: 0,
    packaging_supplies: 0,
    bank_fees: 0,
    owner_draw: 0,
    taxes: 0,
    miscellaneous: 0,
  };

  transactions.forEach((tx) => {
    const config = CATEGORIES_CONFIG[tx.category];
    const group = config?.group || (tx.type === "in" ? "revenue" : "opex");

    if (group === "revenue") {
      totalRevenue += tx.amount;
    } else if (group === "cogs") {
      cogs += tx.amount;
    } else if (group === "equity") {
      ownerDraw += tx.amount;
    } else {
      totalOperatingExpenses += tx.amount;
      opexCategories[tx.category] = (opexCategories[tx.category] || 0) + tx.amount;
    }
  });

  const grossProfit = totalRevenue - cogs;
  const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const netProfitMargin = totalRevenue > 0 ? (netOperatingProfit / totalRevenue) * 100 : 0;
  const netCashFlow = totalRevenue - cogs - totalOperatingExpenses - ownerDraw;

  return {
    period,
    totalRevenue,
    cogs,
    grossProfit,
    grossProfitMargin,
    totalOperatingExpenses,
    operatingExpensesByCategory: opexCategories,
    netOperatingProfit,
    netProfitMargin,
    ownerDraw,
    netCashFlow,
    totalTransactionsCount: transactions.length,
  };
}

export function getExpenseBreakdown(transactions: Transaction[]): CategorySummary[] {
  const expenseMap: Record<string, { total: number; count: number }> = {};
  let totalExpense = 0;

  transactions.forEach((tx) => {
    if (tx.type === "out" && tx.category !== "owner_draw") {
      if (!expenseMap[tx.category]) {
        expenseMap[tx.category] = { total: 0, count: 0 };
      }
      expenseMap[tx.category].total += tx.amount;
      expenseMap[tx.category].count += 1;
      totalExpense += tx.amount;
    }
  });

  const results: CategorySummary[] = Object.keys(expenseMap).map((catKey) => {
    const category = catKey as AccountingCategory;
    const config = CATEGORIES_CONFIG[category];
    const data = expenseMap[category];
    return {
      category,
      label: config?.shortName || category,
      total: data.total,
      count: data.count,
      percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
      color: config?.color || "#94a3b8",
      type: "out",
    };
  });

  return results.sort((a, b) => b.total - a.total);
}

// Client-side CSV / text Statement Parser (Supports copied PDF text & CSV from Thai Banks)
export function parseStatementText(rawText: string, statementType: StatementType = "bank"): Transaction[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsed: Transaction[] = [];

  lines.forEach((line, index) => {
    // Skip common headers
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes("date") ||
      lowerLine.includes("วันที่") ||
      lowerLine.includes("balance") ||
      lowerLine.includes("statement") ||
      lowerLine.includes("เลขที่บัญชี") ||
      lowerLine.includes("account no") ||
      lowerLine.includes("page ") ||
      lowerLine.includes("หน้า ")
    ) {
      return;
    }

    // Attempt comma or tab or multi-space separation
    let parts: string[] = [];
    if (line.includes(",")) {
      parts = line.split(",").map((s) => s.replace(/"/g, "").trim());
    } else if (line.includes("\t")) {
      parts = line.split("\t").map((s) => s.trim());
    } else {
      parts = line.split(/\s{2,}/).map((s) => s.trim());
      if (parts.length < 2) {
        // Single space fallback
        parts = line.split(" ").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (parts.length < 2) return;

    // Detect date
    let dateStr = "";
    let timeStr = "12:00:00";
    let desc = "";
    let amount = 0;
    let type: "in" | "out" = "in";

    // Match YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY or DD/MM/BE_YEAR
    const dateMatch = line.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    if (dateMatch) {
      let rawDate = dateMatch[0].replace(/\//g, "-");
      const dParts = rawDate.split("-");
      if (dParts.length === 3) {
        let y = parseInt(dParts[2] || dParts[0], 10);
        // If Buddhist year (e.g. 2567 -> 2024, 2569 -> 2026)
        if (y > 2400) y -= 543;

        if (dParts[0].length <= 2 && (dParts[2]?.length === 4 || dParts[2]?.length === 2)) {
          // DD-MM-YYYY format
          dateStr = `${y}-${dParts[1].padStart(2, "0")}-${dParts[0].padStart(2, "0")}`;
        } else {
          // YYYY-MM-DD format
          dateStr = `${y}-${dParts[1].padStart(2, "0")}-${dParts[2].padStart(2, "0")}`;
        }
      }
    } else {
      dateStr = new Date().toISOString().split("T")[0];
    }

    // Check for time (HH:mm or HH:mm:ss)
    const timeMatch = line.match(/\b\d{1,2}:\d{2}(:\d{2})?\b/);
    if (timeMatch) {
      timeStr = timeMatch[0];
    }

    // Try finding amounts in columns (numbers with decimals or commas)
    // Match amounts like 1,234.56 or -450.00 or 500.00
    const amountMatches = line.match(/[-+]?\b\d{1,3}(,\d{3})*(\.\d{2})\b/g) ||
                          line.match(/[-+]?\b\d+(\.\d{2})\b/g);

    if (amountMatches && amountMatches.length > 0) {
      // Typically the transaction amount is before the balance
      const rawAmt = amountMatches[0];
      const cleanNum = rawAmt.replace(/,/g, "");
      const val = parseFloat(cleanNum);
      if (!isNaN(val) && Math.abs(val) > 0) {
        amount = Math.abs(val);

        // Determine in or out
        if (
          rawAmt.startsWith("-") ||
          lowerLine.includes("dr") ||
          lowerLine.includes("debit") ||
          lowerLine.includes("ถอน") ||
          lowerLine.includes("จ่าย") ||
          lowerLine.includes("โอนออก") ||
          lowerLine.includes("fee") ||
          lowerLine.includes("ค่าธรรมเนียม") ||
          lowerLine.includes("direct debit")
        ) {
          type = "out";
        } else if (
          rawAmt.startsWith("+") ||
          lowerLine.includes("cr") ||
          lowerLine.includes("credit") ||
          lowerLine.includes("ฝาก") ||
          lowerLine.includes("รับ") ||
          lowerLine.includes("โอนเข้า") ||
          lowerLine.includes("promptpay") ||
          lowerLine.includes("qr payment")
        ) {
          type = "in";
        }
      }
    }

    // Description: strip out date, time, amounts from the line
    let cleanedDesc = line
      .replace(dateMatch ? dateMatch[0] : "", "")
      .replace(timeMatch ? timeMatch[0] : "", "");

    if (amountMatches) {
      amountMatches.forEach((m) => {
        cleanedDesc = cleanedDesc.replace(m, "");
      });
    }

    cleanedDesc = cleanedDesc.replace(/[,;]/g, " ").replace(/\s{2,}/g, " ").trim();
    desc = cleanedDesc || (type === "in" ? "เงินโอนเข้าบัญชี" : "รายการโอนจ่าย/ค่าใช้จ่าย");

    if (amount > 0) {
      parsed.push({
        id: `tx-imp-${Date.now()}-${index}`,
        date: dateStr,
        time: timeStr,
        type,
        amount,
        description: desc,
        channel: "Imported Statement",
        category: type === "in" ? "sales_revenue" : "miscellaneous",
        categoryLabel: type === "in" ? "ยอดขายสินค้า (Sales Revenue)" : "ค่าใช้จ่ายเบ็ดเตล็ด",
        confidence: 0.7,
        status: "review_needed",
        statementType,
      });
    }
  });

  return parsed;
}
