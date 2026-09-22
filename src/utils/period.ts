// Month-period helpers: transactions are grouped by their YYYY-MM key so the
// app can show/reconcile/export one accounting period (month) at a time,
// the way real month-end closing works.

import { Transaction } from "../types";

export const ALL_PERIODS = "all" as const;
export type PeriodKey = typeof ALL_PERIODS | string; // "all" or "YYYY-MM"

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function getMonthKey(dateStr: string): string {
  return (dateStr || "").slice(0, 7); // "YYYY-MM"
}

export function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const name = THAI_MONTHS[m - 1];
  if (!name || isNaN(y)) return monthKey;
  return `${name} ${y}`;
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  transactions.forEach((t) => {
    const key = getMonthKey(t.date);
    if (key) set.add(key);
  });
  return Array.from(set).sort().reverse(); // newest first
}

export function filterByPeriod(transactions: Transaction[], period: PeriodKey): Transaction[] {
  if (period === ALL_PERIODS) return transactions;
  return transactions.filter((t) => getMonthKey(t.date) === period);
}
