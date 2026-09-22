import React, { useRef, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Plus,
  FileSpreadsheet,
  FileDown,
  Trash2,
  Database,
  ChevronDown,
  DownloadCloud,
  UploadCloud,
  CalendarRange,
} from "lucide-react";
import { ALL_PERIODS, formatMonthLabel, PeriodKey } from "../utils/period";

interface HeaderProps {
  activeTab: "pnl" | "statement";
  setActiveTab: (tab: "pnl" | "statement") => void;
  onLoadSampleData: () => void;
  onClearAllData: () => void;
  onOpenAddTxModal: () => void;
  onExportExcel: () => void;
  onExportBackup: () => void;
  onRestoreFile: (file: File) => void;
  txCount: number;
  hasAnyData: boolean;
  netProfit: number;
  availableMonths: string[];
  selectedPeriod: PeriodKey;
  onSelectPeriod: (period: PeriodKey) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onLoadSampleData,
  onClearAllData,
  onOpenAddTxModal,
  onExportExcel,
  onExportBackup,
  onRestoreFile,
  txCount,
  hasAnyData,
  netProfit,
  availableMonths,
  selectedPeriod,
  onSelectPeriod,
}) => {
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onRestoreFile(file);
    e.target.value = "";
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
              <span className="font-bold text-xl tracking-tight">฿</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  NubTung <span className="text-emerald-600 font-semibold text-lg">(นับตังค์)</span>
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  SME Bookkeeping
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                ระบบจัดการสเตทเม้นท์ธนาคาร & บัตรเครดิต สรุปงบกำไรขาดทุนสิ้นเดือน
              </p>
            </div>
          </div>

          {/* Center Quick Stats Badge */}
          <div className="hidden lg:flex items-center space-x-4 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <div className="text-left">
              <span className="text-[11px] font-medium text-slate-400 block">
                {selectedPeriod === ALL_PERIODS ? "รายการในระบบ" : "รายการในงวดนี้"}
              </span>
              <span className="text-sm font-semibold text-slate-700">{txCount} รายการ</span>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="text-left">
              <span className="text-[11px] font-medium text-slate-400 block">กำไรสุทธิ</span>
              <span className={`text-sm font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {netProfit.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium">AI & Rule Engine</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {hasAnyData ? (
              <button
                id="btn-clear-all"
                onClick={onClearAllData}
                className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-600 bg-white border border-slate-300 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors cursor-pointer"
                title="ล้างข้อมูลทั้งหมดเพื่อเริ่มบันทึกข้อมูลจริงใหม่หมด"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span className="hidden md:inline">ล้างข้อมูลทั้งหมด</span>
                <span className="md:hidden">ล้าง</span>
              </button>
            ) : (
              <button
                id="btn-load-sample"
                onClick={onLoadSampleData}
                className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                title="คลิกเพื่อทดลองโหลดตัวอย่างข้อมูลจำลอง"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span className="hidden md:inline">ทดลองโหลดตัวอย่าง</span>
                <span className="md:hidden">ตัวอย่าง</span>
              </button>
            )}

            {/* Backup / Restore dropdown */}
            <div className="relative">
              <button
                id="btn-backup-menu"
                onClick={() => setShowBackupMenu((v) => !v)}
                className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-600 bg-white border border-slate-300 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                title="สำรอง / กู้คืนข้อมูลทั้งหมด"
              >
                <Database className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span className="hidden lg:inline">สำรองข้อมูล</span>
                <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
              </button>

              {showBackupMenu && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowBackupMenu(false)} />
                  <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden py-1">
                    <button
                      onClick={() => {
                        onExportBackup();
                        setShowBackupMenu(false);
                      }}
                      className="w-full flex items-start px-3.5 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                    >
                      <DownloadCloud className="w-4 h-4 mr-2.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>
                        <span className="block text-sm font-medium text-slate-800">ดาวน์โหลดไฟล์สำรอง (.json)</span>
                        <span className="block text-xs text-slate-400">เก็บข้อมูลทั้งหมดไว้กันหาย</span>
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        restoreInputRef.current?.click();
                        setShowBackupMenu(false);
                      }}
                      className="w-full flex items-start px-3.5 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 mr-2.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>
                        <span className="block text-sm font-medium text-slate-800">นำเข้าไฟล์สำรอง</span>
                        <span className="block text-xs text-slate-400">แทนที่ข้อมูลปัจจุบันด้วยไฟล์ที่เลือก</span>
                      </span>
                    </button>
                  </div>
                </>
              )}

              <input
                ref={restoreInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleRestoreInputChange}
              />
            </div>

            <button
              id="btn-export-excel"
              onClick={onExportExcel}
              disabled={txCount === 0}
              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-600 bg-white border border-slate-300 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Export รายการทั้งหมดเป็นไฟล์ Excel (.xlsx)"
            >
              <FileDown className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              <span className="hidden md:inline">Export Excel</span>
              <span className="md:hidden">Excel</span>
            </button>

            <button
              id="btn-add-tx"
              onClick={onOpenAddTxModal}
              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">เพิ่มรายการ</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 pb-2 gap-2">
          <div className="flex space-x-1">
            <button
              id="tab-pnl"
              onClick={() => setActiveTab("pnl")}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === "pnl"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
              <span>งบกำไร-ขาดทุน (P&L Dashboard)</span>
            </button>

            <button
              id="tab-statement"
              onClick={() => setActiveTab("statement")}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === "statement"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
              <span>จัดการ Statement ({txCount})</span>
            </button>
          </div>

          {/* Accounting period (month) selector */}
          <div className="flex items-center">
            <label htmlFor="period-select" className="flex items-center text-xs text-slate-400 mr-1.5 shrink-0">
              <CalendarRange className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">งวด:</span>
            </label>
            <select
              id="period-select"
              value={selectedPeriod}
              onChange={(e) => onSelectPeriod(e.target.value)}
              className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value={ALL_PERIODS}>ทุกงวด (ทั้งหมด)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
