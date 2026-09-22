import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { AccountingCategory, StatementType, Transaction } from "../types";
import { CATEGORIES_CONFIG } from "../data/categories";
import { formatBaht } from "../utils/accounting";

interface PdfStatementImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTransactions: (transactions: Transaction[]) => void;
  statementType: StatementType;
}

interface ParsedPdfTransaction {
  date: string;
  time?: string;
  description: string;
  channel?: string;
  type: "in" | "out";
  amount: number;
  category: AccountingCategory;
  aiReasoning?: string;
}

// Normalize various date formats to ISO YYYY-MM-DD
function normalizeDateStr(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split("-");
    let y = parseInt(parts[0], 10);
    if (y > 2400) y -= 543;
    return `${y}-${parts[1]}-${parts[2]}`;
  }
  const m = str.match(/\b([0-3]?[0-9])[-/.]([0-1]?[0-9])[-/.](20\d{2}|25\d{2}|\d{2})\b/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y > 2400) y -= 543;
    else if (y >= 50 && y < 100) y = (2500 + y) - 543;
    else if (y < 50) y = 2000 + y;
    return `${y}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return str;
}

export const PdfStatementImporterModal: React.FC<PdfStatementImporterModalProps> = ({
  isOpen,
  onClose,
  onImportTransactions,
  statementType,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusStep, setStatusStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [needsPasswordAlert, setNeedsPasswordAlert] = useState(false);

  // Parsed result preview
  const [parsedMeta, setParsedMeta] = useState<{
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    period?: string;
    numPages?: number;
    source?: string;
    notice?: string;
  } | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedPdfTransaction[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".pdf") && selected.type !== "application/pdf") {
      setErrorMessage("กรุณาเลือกไฟล์เอกสารนามสกุล .PDF เท่านั้น");
      return;
    }

    setFile(selected);
    setErrorMessage("");
    setNeedsPasswordAlert(false);
    setParsedItems([]);
    setParsedMeta(null);

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const handleProcessPdf = async () => {
    if (!fileBase64) {
      setErrorMessage("กรุณาเลือกไฟล์ PDF สเตทเม้นท์ก่อนดำเนินการ");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setNeedsPasswordAlert(false);
    setStatusStep("กำลังอ่านและตรวจสอบรหัสไฟล์ PDF...");

    try {
      const response = await fetch("/api/ai/parse-statement-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfBase64: fileBase64,
          password: password.trim(),
          fileName: file?.name || "statement.pdf",
        }),
      });

      const res = await response.json();

      if (!response.ok || !res.success) {
        if (res.needPassword) {
          setNeedsPasswordAlert(true);
          setErrorMessage(
            res.message || "ไฟล์ Statement นี้มีรหัสผ่าน กรุณากรอกรหัสผ่าน (วันเกิด ววดดปปปป) ด้านล่าง"
          );
          setTimeout(() => {
            passwordInputRef.current?.focus();
          }, 150);
        } else {
          let errStr = res.error || res.message || "ไม่สามารถอ่านไฟล์ PDF ได้";
          if (typeof errStr === "object") {
            try {
              errStr = errStr.message || JSON.stringify(errStr);
            } catch {
              errStr = "เกิดข้อผิดพลาดในการประมวลผลไฟล์";
            }
          }
          if (
            errStr.includes("503") ||
            errStr.includes("high demand") ||
            errStr.includes("UNAVAILABLE")
          ) {
            errStr = "โมเดล AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว (503) กรุณากด 'ลองใหม่อีกครั้ง' ระบบจะสลับไปใช้ Smart Engine ทันที";
          }
          setErrorMessage(errStr);
        }
        setIsProcessing(false);
        return;
      }

      // Success
      setStatusStep("จัดเตรียมข้อมูลธุรกรรมที่วิเคราะห์เสร็จสิ้น...");
      const rawTxs: any[] = res.transactions || [];

      const validTxs: ParsedPdfTransaction[] = rawTxs.map((t) => {
        const catKey = (t.category in CATEGORIES_CONFIG
          ? t.category
          : t.type === "in"
          ? "sales_revenue"
          : "miscellaneous") as AccountingCategory;

        return {
          date: normalizeDateStr(t.date),
          time: t.time || "",
          description: t.description || "รายการเดินบัญชี",
          channel: t.channel || "Statement",
          type: t.type === "in" ? "in" : "out",
          amount: Math.abs(Number(t.amount) || 0),
          category: catKey,
          aiReasoning: t.aiReasoning || "วิเคราะห์โดย AI จากสเตทเม้นท์ธนาคาร",
        };
      });

      setParsedMeta({
        bankName: res.bankName,
        accountNumber: res.accountNumber,
        accountName: res.accountName,
        period: res.period,
        numPages: res.numPages,
        source: res.source,
        notice: res.notice,
      });

      if (validTxs.length === 0) {
        setErrorMessage(
          `อ่านเอกสารเสร็จสมบูรณ์ (${res.numPages || 1} หน้า) แต่ระบบไม่พบรายการเดินบัญชีที่ตรงกับตารางธนาคาร\n` +
          `คำแนะนำ:\n` +
          `1. หากไฟล์ Statement ติดรหัสผ่านจากธนาคาร: กรุณากรอกรหัสผ่าน (วันเกิด 8 หลัก เช่น 15082535 หรือเลขบัตรประชาชน) ในช่องด้านล่าง แล้วกด "ลองใหม่อีกครั้ง"\n` +
          `2. หากเป็นไฟล์สเตทเม้นท์ที่ไม่มีรหัสผ่าน ท่านสามารถคัดลอกข้อความในไฟล์มาวางที่ปุ่ม "วางข้อความ Statement" ได้ทันทีครับ`
        );
        setIsProcessing(false);
        return;
      }

      setParsedItems(validTxs);
      // Select all by default
      setSelectedIndices(new Set(validTxs.map((_, i) => i)));
    } catch (err: any) {
      console.error("PDF processing error:", err);
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedItems.map((_, i) => i)));
    }
  };

  const toggleIndex = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIndices(next);
  };

  const handleConfirmImport = () => {
    const chosen = parsedItems.filter((_, idx) => selectedIndices.has(idx));
    if (chosen.length === 0) {
      setErrorMessage("กรุณาเลือกอย่างน้อย 1 รายการเพื่อบันทึก");
      return;
    }

    const timestampNow = Date.now();
    const formattedTransactions: Transaction[] = chosen.map((item, idx) => {
      const config = CATEGORIES_CONFIG[item.category] || CATEGORIES_CONFIG.sales_revenue;

      return {
        id: `tx-pdf-${timestampNow}-${idx}`,
        date: item.date,
        time: item.time || "12:00:00",
        type: item.type,
        amount: item.amount,
        description: item.description,
        channel: item.channel || "Statement PDF",
        category: item.category,
        categoryLabel: config.name,
        confidence: 0.95,
        enhancedByAI: true,
        matchedRule: item.aiReasoning || "สกัดจากไฟล์ PDF โดย Gemini AI",
        status: "verified",
        statementType,
      };
    });

    onImportTransactions(formattedTransactions);
    handleResetModal();
    onClose();
  };

  const handleResetModal = () => {
    setFile(null);
    setFileBase64("");
    setPassword("");
    setErrorMessage("");
    setNeedsPasswordAlert(false);
    setParsedItems([]);
    setParsedMeta(null);
    setSelectedIndices(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Calculations for preview
  const totalSelectedIn = parsedItems
    .filter((t, i) => selectedIndices.has(i) && t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSelectedOut = parsedItems
    .filter((t, i) => selectedIndices.has(i) && t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  นำเข้า Statement ธนาคาร (PDF) ด้วย AI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Gemini Flash AI
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    statementType === "credit_card"
                      ? "bg-violet-50 text-violet-700 border-violet-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  จะบันทึกเป็น: {statementType === "credit_card" ? "บัตรเครดิต" : "ธนาคาร"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                หมดปัญหาทำ CSV ไม่เป็น แค่ใส่ไฟล์ PDF ธนาคาร AI จะสกัดตารางและจัดหมวดหมู่ให้อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl font-bold p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {parsedItems.length === 0 ? (
            <>
              {/* Step 1: Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  file
                    ? "border-emerald-400 bg-emerald-50/40"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  {file ? <FileText className="w-6 h-6 text-emerald-600" /> : <Upload className="w-6 h-6" />}
                </div>

                {file ? (
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{file.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      ขนาด {(file.size / 1024).toFixed(1)} KB &bull; คลิกเพื่อเปลี่ยนไฟล์
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-sm text-slate-800">
                      คลิกเพื่อเลือกไฟล์ PDF หรือลากไฟล์มาวางที่นี่
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      รองรับ Statement จากกสิกร (K PLUS), ไทยพาณิชย์ (SCB), กรุงไทย (NEXT), กรุงเทพ ฯลฯ
                    </div>
                  </div>
                )}
              </div>

              {/* Supported Bank Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <span className="text-slate-400">รองรับสเตทเม้นท์ทุกธนาคาร:</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">กสิกรไทย KBANK</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">ไทยพาณิชย์ SCB</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">กรุงไทย KTB</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">กรุงเทพ BBL</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">TTB</span>
              </div>

              {/* Step 2: Password field for encrypted PDFs */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  needsPasswordAlert
                    ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    <Key className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    รหัสผ่านปลดล็อกไฟล์ PDF ธนาคาร (ถ้ามี)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {needsPasswordAlert ? "⚠️ จำเป็นต้องระบุ" : "หากไม่มี ให้เว้นว่างไว้"}
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="เช่น วันเกิด 8 หลัก (15082535) หรือเลข 4 ตัวท้าย"
                    className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  💡 ปกติธนาคารไทยจะตั้งรหัสเปิดไฟล์ Statement เป็น <strong>วันเกิด ววดดปปปป (พ.ศ.)</strong> เช่น เกิดวันที่ 15 สิงหาคม 2535 รหัสคือ <code className="bg-slate-200/60 px-1 rounded">15082535</code>
                </p>
              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="whitespace-pre-line leading-relaxed">{errorMessage}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleProcessPdf}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-xs self-end sm:self-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    <span>ลองใหม่อีกครั้ง</span>
                  </button>
                </div>
              )}

              {/* Processing Progress */}
              {isProcessing && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-indigo-700 font-semibold text-xs sm:text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>{statusStep || "AI กำลังอ่านและจัดหมวดหมู่ข้อมูล..."}</span>
                  </div>
                  <p className="text-[11px] text-indigo-600">
                    AI กำลังอ่านข้อความ แปลงวันที่ ยอดเงินเข้า-ออก และจัดหมวดบัญชี
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Step 3: Preview Extracted Items */
            <div className="space-y-4">
              {/* Fallback Notice Banner if AI was under high demand */}
              {parsedMeta?.notice && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{parsedMeta.notice}</span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      ระบบแยกยอดเงินเข้า-ออก และจัดหมวดหมู่บัญชีให้เรียบร้อย สามารถตรวจสอบและแก้ไขหมวดหมู่ได้ตามต้องการ
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Banner */}
              <div className="bg-gradient-to-r from-indigo-50 via-teal-50 to-emerald-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-sm text-slate-900">
                      {parsedMeta?.bankName || "ธนาคารพาณิชย์"}
                    </span>
                    {parsedMeta?.numPages && (
                      <span className="text-xs text-slate-500">({parsedMeta.numPages} หน้า)</span>
                    )}
                  </div>
                  {parsedMeta?.accountNumber && (
                    <div className="text-xs text-slate-600 mt-0.5 font-mono">
                      เลขบัญชี: {parsedMeta.accountNumber}
                    </div>
                  )}
                  <div className="text-xs text-emerald-700 font-medium mt-1 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    AI ตรวจพบ {parsedItems.length} รายการ (เลือก {selectedIndices.size} รายการ)
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs bg-white/80 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">เงินเข้ารวม (+)</span>
                    <span className="font-bold text-emerald-600">{formatBaht(totalSelectedIn)}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">เงินออกรวม (-)</span>
                    <span className="font-bold text-rose-600">{formatBaht(totalSelectedOut)}</span>
                  </div>
                </div>
              </div>

              {/* Table Controls */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {selectedIndices.size === parsedItems.length ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
                </button>
                <span className="text-slate-500">
                  คุณสามารถตรวจสอบหรือแก้ไขหมวดหมู่เพิ่มเติมหลังนำเข้าได้
                </span>
              </div>

              {/* Table of Parsed Transactions */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIndices.size === parsedItems.length && parsedItems.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded text-indigo-600 cursor-pointer"
                        />
                      </th>
                      <th className="p-2.5">วันที่ / เวลา</th>
                      <th className="p-2.5">รายการ / ช่องทาง</th>
                      <th className="p-2.5">ประเภท</th>
                      <th className="p-2.5 text-right">จำนวนเงิน</th>
                      <th className="p-2.5">หมวดหมู่บัญชี (โดย AI)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedItems.map((item, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      const catConfig = CATEGORIES_CONFIG[item.category] || CATEGORIES_CONFIG.sales_revenue;

                      return (
                        <tr
                          key={idx}
                          onClick={() => toggleIndex(idx)}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                            isSelected ? "bg-white" : "bg-slate-50/50 opacity-60"
                          }`}
                        >
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleIndex(idx)}
                              className="rounded text-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <div className="font-medium text-slate-900">{item.date}</div>
                            {item.time && <div className="text-[10px] text-slate-400">{item.time}</div>}
                          </td>
                          <td className="p-2.5 max-w-[200px]">
                            <div className="font-medium text-slate-800 truncate" title={item.description}>
                              {item.description}
                            </div>
                            {item.channel && (
                              <div className="text-[10px] text-slate-400 truncate">{item.channel}</div>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            {item.type === "in" ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <ArrowDownLeft className="w-2.5 h-2.5 mr-0.5" />
                                เงินเข้า
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                                เงินออก
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">
                            <span className={item.type === "in" ? "text-emerald-600" : "text-slate-900"}>
                              {item.type === "in" ? "+" : "-"}
                              {item.amount.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${catConfig.badgeColor}`}
                              title={item.aiReasoning}
                            >
                              {catConfig.shortName || catConfig.name}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          {parsedItems.length === 0 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!file || isProcessing}
                onClick={handleProcessPdf}
                className="inline-flex items-center px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 mr-1.5 ${isProcessing ? "animate-spin" : ""}`} />
                {isProcessing ? "AI กำลังอ่านและวิเคราะห์..." : "เริ่มให้ AI อ่าน Statement PDF"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleResetModal}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                &larr; อัปโหลดไฟล์ใหม่
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  disabled={selectedIndices.size === 0}
                  onClick={handleConfirmImport}
                  className="inline-flex items-center px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  บันทึกเข้าสมุดบัญชี ({selectedIndices.size} รายการ)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
