import { useState, useMemo, useEffect } from "react";
import { AlertTriangle, History } from "lucide-react";
import { Header } from "./components/Header";
import { PnLDashboard } from "./components/PnLDashboard";
import { StatementManager } from "./components/StatementManager";
import { AddTransactionModal } from "./components/AddTransactionModal";
import { useToast } from "./components/Toast";
import { SAMPLE_MONTHLY_STATEMENT, SAMPLE_CREDIT_CARD_STATEMENT } from "./data/sampleData";
import { AccountingCategory, Transaction } from "./types";
import { calculatePnL, getExpenseBreakdown } from "./utils/accounting";
import { exportTransactionsToExcel } from "./utils/export";
import { exportBackupJson, parseBackupJson } from "./utils/backup";
import { ALL_PERIODS, filterByPeriod, formatMonthLabel, getAvailableMonths, PeriodKey } from "./utils/period";
import { CATEGORIES_CONFIG } from "./data/categories";

export default function App() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"pnl" | "statement">("pnl");

  // Initialize with empty array so NO sample numbers mix with real data!
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem("nubtung_transactions");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load saved transactions:", e);
    }
    return [];
  });

  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Which accounting period (month) is currently in view. Statement,
  // P&L, and Excel export all scope to this — the way month-end closing
  // actually works — while backup/restore always cover everything.
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>(ALL_PERIODS);

  // Pending restore: parsed from a chosen backup file, held here until the
  // user confirms the overwrite in the modal below.
  const [pendingRestore, setPendingRestore] = useState<{ transactions: Transaction[]; exportedAt?: string } | null>(null);

  // Persist real user transactions
  useEffect(() => {
    try {
      localStorage.setItem("nubtung_transactions", JSON.stringify(transactions));
    } catch (e) {
      console.error("Failed to save transactions:", e);
    }
  }, [transactions]);

  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);

  // Reset back to "all" if the selected month no longer has any data
  // (e.g. after clearing, or restoring a backup without that month).
  useEffect(() => {
    if (selectedPeriod !== ALL_PERIODS && !availableMonths.includes(selectedPeriod)) {
      setSelectedPeriod(ALL_PERIODS);
    }
  }, [availableMonths, selectedPeriod]);

  const periodTransactions = useMemo(
    () => filterByPeriod(transactions, selectedPeriod),
    [transactions, selectedPeriod]
  );

  // Recalculate P&L and Expense Breakdown for the selected period only
  const pnlReport = useMemo(() => {
    const periodName =
      selectedPeriod === ALL_PERIODS
        ? periodTransactions.length > 0
          ? `ทุกงวด (${periodTransactions.length} รายการ)`
          : "ยังไม่มีรายการ"
        : formatMonthLabel(selectedPeriod);
    return calculatePnL(periodTransactions, periodName);
  }, [periodTransactions, selectedPeriod]);

  const expenseBreakdown = useMemo(() => getExpenseBreakdown(periodTransactions), [periodTransactions]);

  // Handler: Update category of a transaction
  const handleUpdateCategory = (id: string, newCategory: AccountingCategory) => {
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id === id) {
          const config = CATEGORIES_CONFIG[newCategory];
          return {
            ...tx,
            category: newCategory,
            categoryLabel: config?.name || newCategory,
            confidence: 1.0,
            matchedRule: "ปรับแก้ด้วยตนเอง (Manual Override)",
            status: "verified",
          };
        }
        return tx;
      })
    );
  };

  // Handler: Delete transaction
  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  // Handler: Add batch transactions from file / paste
  const handleAddBatchTransactions = (newTxs: Transaction[]) => {
    setTransactions((prev) => [...newTxs, ...prev]);
  };

  // Handler: Add new single transaction
  const handleAddSingleTransaction = (tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev]);
  };

  // Handler: Re-categorize all transactions with AI backend
  const handleReCategorizeAll = async () => {
    setIsCategorizing(true);
    try {
      const response = await fetch("/api/ai/categorize-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: transactions.map((t) => ({
            id: t.id,
            description: t.description,
            channel: t.channel,
            amount: t.amount,
            type: t.type,
          })),
        }),
      });

      const json = await response.json();
      if (json.success && Array.isArray(json.results)) {
        const resultMap = new Map<string, any>(json.results.map((r: any) => [r.id, r]));

        setTransactions((prev) =>
          prev.map((tx) => {
            if (resultMap.has(tx.id)) {
              const res = resultMap.get(tx.id);
              return {
                ...tx,
                category: res.category as AccountingCategory,
                categoryLabel: res.label || tx.categoryLabel,
                confidence: res.confidence || tx.confidence,
                matchedRule: res.matchedRule || tx.matchedRule,
                enhancedByAI: res.enhancedByAI,
                status: "verified",
              };
            }
            return tx;
          })
        );
      }
    } catch (err) {
      console.error("AI categorization failed:", err);
      showToast("จัดหมวดหมู่ด้วยระบบ Rule Engine ภายในสำเร็จเรียบร้อย", "info");
    } finally {
      setIsCategorizing(false);
    }
  };

  // Handler: Export the currently selected period to an Excel workbook
  // (split by bank / credit card, plus a P&L summary sheet)
  const handleExportExcel = () => {
    if (periodTransactions.length === 0) {
      showToast("ยังไม่มีรายการให้ export ครับ", "info");
      return;
    }
    try {
      exportTransactionsToExcel(periodTransactions, pnlReport, expenseBreakdown);
      showToast("Export ไฟล์ Excel สำเร็จแล้ว", "success");
    } catch (e) {
      console.error("Export to Excel failed:", e);
      showToast("Export ไฟล์ Excel ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    }
  };

  // Handler: Download a full backup of ALL data (regardless of the period
  // filter) as JSON — separate from the Excel export, which is for reading,
  // not for restoring back into the app.
  const handleExportBackup = () => {
    if (transactions.length === 0) {
      showToast("ยังไม่มีข้อมูลให้สำรองครับ", "info");
      return;
    }
    try {
      exportBackupJson(transactions);
      showToast("ดาวน์โหลดไฟล์สำรองข้อมูลสำเร็จแล้ว", "success");
    } catch (e) {
      console.error("Backup export failed:", e);
      showToast("สำรองข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    }
  };

  // Handler: Read a chosen backup file and stage it for confirmation before
  // overwriting current data (restoring is destructive, so it goes through
  // the same confirm-modal pattern as clearing all data).
  const handleRestoreFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseBackupJson(text);
        setPendingRestore(parsed);
      } catch (e: any) {
        showToast(e.message || "ไม่สามารถอ่านไฟล์สำรองข้อมูลนี้ได้", "error");
      }
    };
    reader.onerror = () => showToast("ไม่สามารถอ่านไฟล์นี้ได้ กรุณาลองใหม่อีกครั้ง", "error");
    reader.readAsText(file);
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    setTransactions(pendingRestore.transactions);
    setSelectedPeriod(ALL_PERIODS);
    setPendingRestore(null);
    showToast(`กู้คืนข้อมูล ${pendingRestore.transactions.length} รายการสำเร็จแล้ว`, "success");
  };

  // Clear all data to wipe clean — asks for confirmation via an in-app modal
  // instead of window.confirm(), which blocks the whole tab and can hang
  // silently inside webviews / in-app browsers that suppress native dialogs.
  const handleClearAllData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAllData = () => {
    setTransactions([]);
    localStorage.removeItem("nubtung_transactions");
    setShowClearConfirm(false);
    showToast("ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว พร้อมเริ่มบันทึกข้อมูลจริง", "success");
  };

  // Load sample data: both the bank statement and the credit-card statement,
  // so the reconciliation view between the two has something to show.
  const handleLoadSampleData = () => {
    setTransactions([...SAMPLE_MONTHLY_STATEMENT, ...SAMPLE_CREDIT_CARD_STATEMENT]);
    showToast("โหลดข้อมูลตัวอย่างสเตทเม้นท์ธนาคาร + บัตรเครดิต ประจำเดือนกันยายน 2026 สำเร็จ!", "success");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLoadSampleData={handleLoadSampleData}
        onClearAllData={handleClearAllData}
        onOpenAddTxModal={() => setIsAddTxModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportBackup={handleExportBackup}
        onRestoreFile={handleRestoreFile}
        txCount={periodTransactions.length}
        hasAnyData={transactions.length > 0}
        netProfit={pnlReport.netOperatingProfit}
        availableMonths={availableMonths}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setSelectedPeriod}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === "pnl" && (
          <PnLDashboard
            pnl={pnlReport}
            expenseBreakdown={expenseBreakdown}
            transactions={periodTransactions}
            onSwitchToStatement={() => setActiveTab("statement")}
          />
        )}

        {activeTab === "statement" && (
          <StatementManager
            transactions={periodTransactions}
            onUpdateCategory={handleUpdateCategory}
            onDeleteTransaction={handleDeleteTransaction}
            onAddBatchTransactions={handleAddBatchTransactions}
            onReCategorizeAll={handleReCategorizeAll}
            isCategorizing={isCategorizing}
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-slate-700">NubTung (นับตังค์)</strong> — ระบบบัญชีและวิเคราะห์กำไรขาดทุนจาก Statement ธนาคาร & บัตรเครดิต
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Thai SME Accounting Tech</span>
            <span>•</span>
            <span>ระบบบันทึกและตรวจสอบบัญชีร้านค้า</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        onAddTransaction={handleAddSingleTransaction}
        showToast={showToast}
      />

      {/* Clear-all confirmation modal (replaces window.confirm) */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ล้างข้อมูลทั้งหมด?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  คุณต้องการล้างข้อมูลทั้งหมดเพื่อเริ่มบันทึกข้อมูลจริงใหม่หมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmClearAllData}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer shadow-xs"
              >
                ล้างข้อมูลทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore-backup confirmation modal */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">กู้คืนข้อมูลจากไฟล์สำรอง?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  พบข้อมูล {pendingRestore.transactions.length} รายการในไฟล์สำรอง
                  {pendingRestore.exportedAt &&
                    ` (สำรองไว้เมื่อ ${new Date(pendingRestore.exportedAt).toLocaleString("th-TH")})`}
                  {" "}
                  การกู้คืนจะ<strong>แทนที่ข้อมูลปัจจุบันทั้งหมด</strong> การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={() => setPendingRestore(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmRestore}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-xs"
              >
                กู้คืนข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
