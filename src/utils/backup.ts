// Full-data backup / restore as JSON. Separate from the Excel export, which
// is formatted for a human to read — this is a round-trippable snapshot of
// everything in the app, since all data currently lives only in this
// browser's localStorage and would otherwise be lost if it's ever cleared.

import { Transaction } from "../types";

const BACKUP_APP_ID = "nubtung";
const BACKUP_VERSION = 1;

export interface NubTungBackup {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  transactions: Transaction[];
}

export function exportBackupJson(transactions: Transaction[]): void {
  const payload: NubTungBackup = {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    transactions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `NubTung_backup_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function isValidTransaction(t: any): t is Transaction {
  return (
    t &&
    typeof t.id === "string" &&
    typeof t.date === "string" &&
    (t.type === "in" || t.type === "out") &&
    typeof t.amount === "number" &&
    typeof t.description === "string"
  );
}

// Throws with a Thai, user-facing message on anything invalid.
export function parseBackupJson(text: string): { transactions: Transaction[]; exportedAt?: string } {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("ไฟล์นี้ไม่ใช่ไฟล์ JSON ที่อ่านได้ กรุณาเลือกไฟล์สำรองข้อมูล (.json) ของ NubTung");
  }

  if (!data || !Array.isArray(data.transactions)) {
    throw new Error("ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลของ NubTung");
  }

  if (!data.transactions.every(isValidTransaction)) {
    throw new Error("ไฟล์สำรองข้อมูลมีรูปแบบไม่ถูกต้องหรือเสียหาย");
  }

  return { transactions: data.transactions as Transaction[], exportedAt: data.exportedAt };
}
