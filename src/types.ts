export type TransactionType = "in" | "out";

// Which statement a transaction came from — lets a shop keep its bank
// statement and credit-card statement as two clear sets to reconcile
// against each other at month-end close.
export type StatementType = "bank" | "credit_card";

export type AccountingCategory =
  | "sales_revenue"
  | "service_revenue"
  | "other_income"
  | "cogs"
  | "shipping_logistics"
  | "marketing_ads"
  | "utilities_rent"
  | "salary_wage"
  | "packaging_supplies"
  | "bank_fees"
  | "owner_draw"
  | "taxes"
  | "miscellaneous";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm:ss
  type: TransactionType;
  amount: number;
  description: string;
  channel: string; // e.g., 'K PLUS PromptPay', 'SCB Easy', 'EDC', 'Direct Debit'
  category: AccountingCategory;
  categoryLabel: string;
  confidence: number;
  matchedRule?: string;
  enhancedByAI?: boolean;
  notes?: string;
  statementType: StatementType;
  status: "verified" | "review_needed";
}

export interface CategorySummary {
  category: AccountingCategory;
  label: string;
  total: number;
  count: number;
  percentage: number;
  color: string;
  type: TransactionType;
}

export interface ProfitAndLossReport {
  period: string;
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  grossProfitMargin: number;
  totalOperatingExpenses: number;
  operatingExpensesByCategory: Record<AccountingCategory, number>;
  netOperatingProfit: number;
  netProfitMargin: number;
  ownerDraw: number;
  netCashFlow: number;
  totalTransactionsCount: number;
}
