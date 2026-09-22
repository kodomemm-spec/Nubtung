import React, { useState, useMemo } from "react";
import {
  Search,
  Upload,
  Sparkles,
  Download,
  Trash2,
  FileText,
  Filter,
  HelpCircle,
  Key,
  ShieldCheck,
  Copy,
  FileSpreadsheet,
  Printer,
  Landmark,
  CreditCard,
  Scale,
} from "lucide-react";
import { AccountingCategory, StatementType, Transaction } from "../types";
import { CATEGORIES_CONFIG } from "../data/categories";
import { formatBaht, parseStatementText } from "../utils/accounting";
import { PdfStatementImporterModal } from "./PdfStatementImporterModal";
import { ToastType } from "./Toast";

interface StatementManagerProps {
  transactions: Transaction[];
  onUpdateCategory: (id: string, newCategory: AccountingCategory) => void;
  onDeleteTransaction: (id: string) => void;
  onAddBatchTransactions: (txs: Transaction[]) => void;
  onReCategorizeAll: () => Promise<void>;
  isCategorizing: boolean;
  showToast: (message: string, type?: ToastType) => void;
}

export const StatementManager: React.FC<StatementManagerProps> = ({
  transactions,
  onUpdateCategory,
  onDeleteTransaction,
  onAddBatchTransactions,
  onReCategorizeAll,
  isCategorizing,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "in" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | StatementType>("all");
  const [importStatementType, setImportStatementType] = useState<StatementType>("bank");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showHelpGuideModal, setShowHelpGuideModal] = useState(false);
  const [pastedText, setPastedText] = useState("");

  // Filtering
  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.channel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.amount.toString().includes(searchTerm);

    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || tx.category === categoryFilter;
    const matchesSource = sourceFilter === "all" || tx.statementType === sourceFilter;

    return matchesSearch && matchesType && matchesCategory && matchesSource;
  });

  // Reconciliation summary: bank vs credit card, side by side, so the two
  // statement sets can be compared against each other at month-end.
  const reconciliation = useMemo(() => {
    const summarize = (type: StatementType) => {
      const items = transactions.filter((tx) => tx.statementType === type);
      const totalIn = items.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
      const totalOut = items.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
      return { count: items.length, totalIn, totalOut };
    };
    return { bank: summarize("bank"), credit_card: summarize("credit_card") };
  }, [transactions]);

  // Handle file drop / upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseStatementText(text, importStatementType);
        if (parsed.length > 0) {
          onAddBatchTransactions(parsed);
          showToast(`นำเข้าสำเร็จ ${parsed.length} รายการจากไฟล์ Statement`, "success");
        } else {
          showToast("ไม่พบรายการที่สามารถอ่านได้ กรุณาตรวจสอบรูปแบบไฟล์ CSV หรือคัดลอกข้อความมาวาง", "error");
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    const parsed = parseStatementText(pastedText, importStatementType);
    if (parsed.length > 0) {
      onAddBatchTransactions(parsed);
      setPastedText("");
      setShowPasteModal(false);
      showToast(`นำเข้าสำเร็จ ${parsed.length} รายการจากข้อความ`, "success");
    } else {
      showToast("ไม่พบรายการที่ตรงกับรูปแบบวันที่และจำนวนเงิน", "error");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["ID", "Date", "Time", "Type", "Amount", "Description", "Channel", "Category", "StatementType", "MatchedRule"];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.time || "",
      t.type,
      t.amount,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.channel.replace(/"/g, '""')}"`,
      t.category,
      t.statementType,
      `"${(t.matchedRule || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NubTung_Statement_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Reconciliation Summary: Bank vs Credit Card, side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">สเตทเม้นท์ธนาคาร</span>
            </div>
            <span className="text-xs text-slate-400">{reconciliation.bank.count} รายการ</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-emerald-50/60 rounded-lg p-2">
              <span className="text-emerald-700 block">เงินเข้า</span>
              <span className="font-bold text-emerald-700">{formatBaht(reconciliation.bank.totalIn)}</span>
            </div>
            <div className="bg-rose-50/60 rounded-lg p-2">
              <span className="text-rose-700 block">เงินออก</span>
              <span className="font-bold text-rose-700">{formatBaht(reconciliation.bank.totalOut)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">สเตทเม้นท์บัตรเครดิต</span>
            </div>
            <span className="text-xs text-slate-400">{reconciliation.credit_card.count} รายการ</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-emerald-50/60 rounded-lg p-2">
              <span className="text-emerald-700 block">เงินเข้า</span>
              <span className="font-bold text-emerald-700">{formatBaht(reconciliation.credit_card.totalIn)}</span>
            </div>
            <div className="bg-rose-50/60 rounded-lg p-2">
              <span className="text-rose-700 block">เงินออก (ยอดใช้จ่าย)</span>
              <span className="font-bold text-rose-700">{formatBaht(reconciliation.credit_card.totalOut)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            รายการเดินบัญชีทั้งหมด ({transactions.length} รายการ)
          </h2>
          <p className="text-xs text-slate-500">
            ระบบช่วยจัดหมวดหมู่ทางบัญชีอัตโนมัติ คุณสามารถเปลี่ยนหมวดหมู่เพื่ออัปเดตงบ P&L ได้ทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Which statement new imports belong to */}
          <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50" title="รายการที่นำเข้าใหม่จะถูกแท็กเป็นประเภทนี้">
            <span className="pl-1.5 pr-0.5 text-slate-400">
              <Scale className="w-3.5 h-3.5" />
            </span>
            <button
              onClick={() => setImportStatementType("bank")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                importStatementType === "bank" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              กำลังนำเข้า: ธนาคาร
            </button>
            <button
              onClick={() => setImportStatementType("credit_card")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                importStatementType === "credit_card" ? "bg-violet-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              บัตรเครดิต
            </button>
          </div>

          {/* AI PDF Statement Import Button */}
          <button
            onClick={() => setShowPdfModal(true)}
            className="inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 transition-all shadow-xs cursor-pointer"
            title="นำเข้าไฟล์ Statement PDF จากธนาคารด้วย AI โดยไม่ต้องแปลงเป็น CSV"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-200" />
            นำเข้าไฟล์ PDF ด้วย AI
          </button>

          {/* Help button for statement passwords */}
          <button
            onClick={() => setShowHelpGuideModal(true)}
            className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
            title="วิธีนำเข้า Statement ที่ติดรหัสผ่านจากแอปธนาคาร"
          >
            <HelpCircle className="w-4 h-4 mr-1.5 text-amber-600" />
            สเตทเม้นท์ติดรหัสทำไง?
          </button>

          {/* AI Re-categorize */}
          <button
            onClick={onReCategorizeAll}
            disabled={isCategorizing || transactions.length === 0}
            className="inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
            title="ให้ AI ช่วยวิเคราะห์จัดหมวดหมู่รายการทั้งหมดอีกครั้ง"
          >
            <Sparkles className={`w-4 h-4 mr-1.5 text-indigo-600 ${isCategorizing ? "animate-spin" : ""}`} />
            {isCategorizing ? "กำลังวิเคราะห์..." : "AI จัดหมวดหมู่ใหม่"}
          </button>

          {/* Paste Statement Text */}
          <button
            onClick={() => setShowPasteModal(true)}
            className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-1.5 text-slate-600" />
            วางข้อความ
          </button>

          {/* Upload File */}
          <label className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 mr-1.5 text-slate-600" />
            นำเข้า CSV
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            title="ส่งออกข้อมูลเป็น CSV"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-600" />
            Export
          </button>
        </div>
      </div>

      {/* Quick Tip Banner for statement password & AI */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-amber-900">
              AI ไม่ต้องใส่รหัสผ่านใดๆ | หากไฟล์ Statement จากแอปธนาคารติดรหัสผ่าน (PDF):
            </span>
            <span className="text-amber-800 ml-1">
              เปิดไฟล์ใส่รหัสตามปกติ แล้วลากคลุมดำคัดลอก (Copy) มากดปุ่ม "วางข้อความ Statement" ได้ทันที
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowHelpGuideModal(true)}
          className="text-amber-900 font-bold underline hover:text-amber-700 shrink-0 cursor-pointer"
        >
          ดูวิธีทำอย่างละเอียด →
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อรายการ, ช่องทางโอน, จำนวนเงิน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              typeFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setTypeFilter("in")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              typeFilter === "in" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            เงินเข้า (+)
          </button>
          <button
            onClick={() => setTypeFilter("out")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              typeFilter === "out" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            เงินออก (-)
          </button>
        </div>

        {/* Source (Statement) Filter — view bank / credit card separately to reconcile */}
        <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
          <button
            onClick={() => setSourceFilter("all")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              sourceFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setSourceFilter("bank")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              sourceFilter === "bank" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ธนาคาร
          </button>
          <button
            onClick={() => setSourceFilter("credit_card")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              sourceFilter === "credit_card" ? "bg-violet-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            บัตรเครดิต
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center">
          <Filter className="w-4 h-4 text-slate-400 mr-1.5 hidden sm:block" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">ทุกหมวดหมู่บัญชี</option>
            {Object.values(CATEGORIES_CONFIG).map((cfg) => (
              <option key={cfg.key} value={cfg.key}>
                {cfg.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">วัน-เวลา</th>
                <th className="py-3 px-4">รายการ / บันทึก</th>
                <th className="py-3 px-4">สเตทเม้นท์</th>
                <th className="py-3 px-4">ช่องทาง</th>
                <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                <th className="py-3 px-4">หมวดหมู่บัญชี</th>
                <th className="py-3 px-4">เหตุผลของระบบ</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-base font-bold text-slate-800">
                      {transactions.length === 0
                        ? "ยังไม่มีรายการเดินบัญชีในระบบ"
                        : "ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {transactions.length === 0
                        ? "คุณสามารถนำเข้าไฟล์ PDF Statement ธนาคารโดยตรง หรือก๊อปปี้ข้อความมาวาง เพื่อให้ AI คำนวณกำไร-ขาดทุนทันที"
                        : "ลองเปลี่ยนคำค้นหา หรือปรับตัวกรองประเภทรายการ"}
                    </p>

                    {transactions.length === 0 && (
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={() => setShowPdfModal(true)}
                          className="inline-flex items-center px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 shadow-sm cursor-pointer transition-all"
                        >
                          <Sparkles className="w-4 h-4 mr-1.5" />
                          นำเข้าไฟล์ PDF ด้วย AI (แนะนำ)
                        </button>
                        <button
                          onClick={() => setShowPasteModal(true)}
                          className="inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-1.5 text-slate-600" />
                          วางข้อความ Statement
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isMoneyIn = tx.type === "in";
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 block">{tx.date}</span>
                        {tx.time && (
                          <span className="text-xs text-slate-400 block">{tx.time}</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block text-sm">
                          {tx.description}
                        </span>
                      </td>

                      {/* Statement Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.statementType === "credit_card" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                            <CreditCard className="w-3 h-3 mr-1" />
                            บัตรเครดิต
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Landmark className="w-3 h-3 mr-1" />
                            ธนาคาร
                          </span>
                        )}
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          {tx.channel}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-sm sm:text-base ${
                            isMoneyIn ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {formatBaht(tx.amount, true)}
                        </span>
                      </td>

                      {/* Category Dropdown */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={tx.category}
                          onChange={(e) =>
                            onUpdateCategory(tx.id, e.target.value as AccountingCategory)
                          }
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          {Object.values(CATEGORIES_CONFIG)
                            .filter((c) => (isMoneyIn ? c.type === "in" : c.type === "out"))
                            .map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </td>

                      {/* Matched Rule / AI info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          {tx.enhancedByAI ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Sparkles className="w-3 h-3 mr-0.5 text-indigo-600" />
                              AI Verified
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 line-clamp-1" title={tx.matchedRule}>
                              {tx.matchedRule || "Auto Classified"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paste Statement Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  วางข้อความรายการเดินบัญชี (Paste Bank Statement)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รองรับข้อความที่ก๊อปปี้มาจาก PDF สเตทเม้นท์ทุกธนาคาร (กสิกร, ไทยพาณิชย์, กรุงไทย ฯลฯ)
                </p>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Quick helper tip */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
              <div className="font-semibold flex items-center">
                <Copy className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                วิธีนำเข้าจากไฟล์ PDF ที่ติดรหัสผ่านง่ายที่สุด:
              </div>
              <p className="text-emerald-800 leading-relaxed">
                เปิดไฟล์ PDF ในคอมหรือมือถือด้วยรหัสผ่านของคุณตามปกติ &rarr; ลากคลุมดำหรือกด Ctrl+A (Command+A) เพื่อคัดลอกตัวหนังสือ &rarr; นำมาวางในช่องนี้แล้วกด "แปลงข้อมูลและบันทึก" ได้ทันที!
              </p>
            </div>

            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`ตัวอย่างที่ก๊อปปี้มาวาง (ตาราง PDF หรือข้อความเดินบัญชี):\n15/09/2026 10:30 TR TRANSFER PROMPTPAY 1,290.00\n16/09/2026 14:15 DIRECT DEBIT META ADS -2,500.00\n17/09/2026 16:45 FLASH EXPRESS COD -480.00`}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasteModal(false);
                  setShowHelpGuideModal(true);
                }}
                className="text-xs text-amber-700 hover:text-amber-800 font-medium underline cursor-pointer"
              >
                ดูวิธีปลดรหัสผ่านไฟล์ PDF &rarr;
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handlePasteSubmit}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-xs"
                >
                  แปลงข้อมูลและบันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Guide Modal: Statement Passwords & AI */}
      {showHelpGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    ไขข้อข้องใจ: เรื่องรหัส AI และไฟล์ Statement ติดรหัสผ่าน
                  </h3>
                  <p className="text-xs text-slate-500">
                    ขั้นตอนง่ายๆ ในการนำเข้า Statement สู่ระบบ NubTung
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Part 1: AI Key */}
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                <h4 className="text-sm font-bold text-indigo-900">
                  1. เรื่องรหัสของ AI (API Key): ไม่ต้องใส่รหัสอะไรเลย!
                </h4>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed pl-7">
                ระบบ NubTung เชื่อมต่อระบบปัญญาประดิษฐ์ (Google Gemini) ไว้ที่ Server หลังบ้านให้เรียบร้อยแล้ว
                คุณ<strong>ไม่ต้องสมัครรหัส หรือกรอก API Key เองใดๆ ทั้งสิ้น</strong> สามารถกดปุ่ม "AI จัดหมวดหมู่อัจฉริยะ" หรือ "นำเข้าไฟล์ PDF ด้วย AI" ได้ทันที
              </p>
            </div>

            {/* Part 2: Statement PDF Password */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-600 shrink-0" />
                <h4 className="text-sm font-bold text-slate-900">
                  2. เรื่องไฟล์ Statement จากแอปธนาคารที่ติดรหัสผ่าน (PDF Password)
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                เนื่องจากธนาคารไทย (กสิกร K PLUS, ไทยพาณิชย์ SCB, กรุงไทย NEXT ฯลฯ) จะใส่รหัสผ่านล็อกไฟล์ PDF เสมอเพื่อความปลอดภัย
                (ส่วนใหญ่คือ <strong>วันเกิด ววดดปปปป (พ.ศ.)</strong> เช่น เกิด 15 สิงหาคม 2535 รหัสคือ <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">15082535</code> หรือเลขบัตรประชาชน 4 ตัวท้าย)
              </p>

              <div className="font-semibold text-xs text-slate-700 pt-1">
                คุณสามารถนำข้อมูลเข้าได้ 3 วิธีง่ายๆ ดังนี้:
              </div>

              {/* 3 Methods */}
              <div className="space-y-3 text-xs">
                {/* Method 1 */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-emerald-900">
                    <span className="flex items-center">
                      <Copy className="w-4 h-4 mr-1.5 text-emerald-700" />
                      วิธีที่ 1 (แนะนำที่สุด): คัดลอกข้อความตารางมาวางตรงๆ
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-800 font-bold">
                      ง่าย & เร็วสุด
                    </span>
                  </div>
                  <ol className="list-decimal pl-5 text-emerald-800 space-y-1 leading-relaxed">
                    <li>เปิดไฟล์ PDF ในคอมพิวเตอร์หรือมือถือด้วยรหัสผ่านของคุณตามปกติ</li>
                    <li>กด <strong>Ctrl+A</strong> (หรือ Command+A บน Mac) เพื่อเลือกข้อความทั้งหมด แล้วกด <strong>Ctrl+C</strong> เพื่อคัดลอก</li>
                    <li>กลับมาที่หน้า NubTung แล้วคลิกปุ่ม <strong>"วางข้อความ Statement"</strong></li>
                    <li>กดวาง (Ctrl+V) แล้วคลิกบันทึก ระบบจะแยกวันที่ เวลา ยอดเงิน และจัดหมวดหมู่อัตโนมัติ</li>
                  </ol>
                </div>

                {/* Method 2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="flex items-center">
                      <FileSpreadsheet className="w-4 h-4 mr-1.5 text-slate-700" />
                      วิธีที่ 2: ขอไฟล์เป็น CSV หรือ Excel จาก Internet Banking
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                      ไม่มีรหัสผ่าน
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    หากคุณเข้าใช้งานผ่านคอมพิวเตอร์ (เช่น K-Cyber, SCB Business Anywhere)
                    คุณสามารถเลือกดาวน์โหลด Statement เป็นไฟล์ <strong>.CSV</strong> หรือ Excel ได้ ซึ่งไฟล์ประเภทนี้<strong>จะไม่มีรหัสผ่านล็อกไว้</strong> และสามารถกดลากไฟล์เข้าปุ่ม "นำเข้าไฟล์ CSV" ได้เลย
                  </p>
                </div>

                {/* Method 3 */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="flex items-center">
                      <Printer className="w-4 h-4 mr-1.5 text-slate-700" />
                      วิธีที่ 3: ปลดรหัสผ่านไฟล์ PDF อย่างถาวร (Print to PDF)
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    เปิดไฟล์ PDF ใส่รหัสผ่าน &rarr; กดคำสั่งพิมพ์ (Ctrl+P หรือ Print) &rarr; ตรงช่องเลือกเครื่องพิมพ์ ให้เปลี่ยนเป็น <strong>"Save as PDF" (บันทึกเป็น PDF)</strong> &rarr; กดบันทึก ไฟล์ใหม่ที่ได้จะถูกปลดรหัสผ่านออกอย่างถาวร
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowHelpGuideModal(false);
                  setShowPasteModal(true);
                }}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
              >
                เข้าใจแล้ว ลองวางข้อความ Statement เลย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Statement Importer with AI */}
      <PdfStatementImporterModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        onImportTransactions={onAddBatchTransactions}
        statementType={importStatementType}
      />
    </div>
  );
};
