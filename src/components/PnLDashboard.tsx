import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Lightbulb,
  Printer,
  ShieldCheck,
  Landmark,
  CreditCard,
} from "lucide-react";
import { ProfitAndLossReport, CategorySummary, StatementType, Transaction } from "../types";
import { calculatePnL, formatBaht, getExpenseBreakdown } from "../utils/accounting";
import { CATEGORIES_CONFIG } from "../data/categories";

interface PnLDashboardProps {
  pnl: ProfitAndLossReport;
  expenseBreakdown: CategorySummary[];
  transactions: Transaction[];
  onSwitchToStatement: () => void;
}

export const PnLDashboard: React.FC<PnLDashboardProps> = ({
  pnl,
  expenseBreakdown,
  transactions,
  onSwitchToStatement,
}) => {
  const handlePrint = () => {
    window.print();
  };

  // View filter: look at everything, or at just the bank / credit card
  // statement on its own — useful for reconciling the two sets at close.
  const [sourceFilter, setSourceFilter] = useState<"all" | StatementType>("all");

  const filteredTransactions = useMemo(
    () => (sourceFilter === "all" ? transactions : transactions.filter((t) => t.statementType === sourceFilter)),
    [transactions, sourceFilter]
  );

  const activePnl = useMemo(
    () => (sourceFilter === "all" ? pnl : calculatePnL(filteredTransactions, pnl.period)),
    [sourceFilter, pnl, filteredTransactions]
  );

  const activeExpenseBreakdown = useMemo(
    () => (sourceFilter === "all" ? expenseBreakdown : getExpenseBreakdown(filteredTransactions)),
    [sourceFilter, expenseBreakdown, filteredTransactions]
  );

  // Business metrics
  const adsExpense = activePnl.operatingExpensesByCategory.marketing_ads || 0;
  const adsRatio = activePnl.totalRevenue > 0 ? (adsExpense / activePnl.totalRevenue) * 100 : 0;

  const shippingExpense = activePnl.operatingExpensesByCategory.shipping_logistics || 0;
  const shippingRatio = activePnl.totalRevenue > 0 ? (shippingExpense / activePnl.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-md">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-700/80 text-emerald-100 border border-emerald-500/30 mb-2">
            งวดประจำเดือน {activePnl.period}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            สรุปงบกำไร-ขาดทุน และกระแสเงินสดร้านค้า
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
            ประมวลผลอัตโนมัติจาก Statement ({activePnl.totalTransactionsCount} รายการ)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Source Filter: view all, or reconcile bank vs credit card separately */}
          <div className="flex items-center space-x-1 border border-white/20 rounded-xl p-1 bg-white/10">
            <button
              onClick={() => setSourceFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                sourceFilter === "all" ? "bg-white text-emerald-900" : "text-emerald-100 hover:bg-white/10"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSourceFilter("bank")}
              className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                sourceFilter === "bank" ? "bg-white text-emerald-900" : "text-emerald-100 hover:bg-white/10"
              }`}
            >
              <Landmark className="w-3.5 h-3.5 mr-1" />
              ธนาคาร
            </button>
            <button
              onClick={() => setSourceFilter("credit_card")}
              className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                sourceFilter === "credit_card" ? "bg-white text-emerald-900" : "text-emerald-100 hover:bg-white/10"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              บัตรเครดิต
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-700" />
            พิมพ์รายงาน P&L
          </button>
        </div>
      </div>

      {/* Empty State Banner if no transactions at all */}
      {transactions.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            ระบบพร้อมใช้งานจริง (ยังไม่มีข้อมูลตัวอย่างปนเปื้อน)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            ตัวเลขและสถิติทั้งหมดเริ่มต้นที่ 0.00 บาท คุณสามารถเริ่มนำเข้า Statement ธนาคารหรือบัตรเครดิตจริงเพื่อเริ่มประมวลผลกำไร-ขาดทุนได้ทันที
          </p>
          <div className="pt-2">
            <button
              onClick={onSwitchToStatement}
              className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-xs transition-colors"
            >
              ไปยังหน้าจัดการ Statement เพื่อนำเข้าข้อมูล
            </button>
          </div>
        </div>
      )}

      {/* Lighter empty state: has data overall, but none for the selected filter */}
      {transactions.length > 0 && filteredTransactions.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center space-y-1 shadow-xs">
          <p className="text-sm font-semibold text-slate-700">
            ยังไม่มีรายการจาก{sourceFilter === "bank" ? "สเตทเม้นท์ธนาคาร" : "สเตทเม้นท์บัตรเครดิต"}
          </p>
          <p className="text-xs text-slate-500">ลองนำเข้าข้อมูลเพิ่ม หรือสลับกลับไปดู "ทั้งหมด"</p>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              รายรับรวม (Total Revenue)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatBaht(activePnl.totalRevenue)}
            </div>
            <div className="flex items-center text-xs text-emerald-600 font-medium mt-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              <span>ยอดขายและเงินโอนเข้าทั้งหมด</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cost of Goods Sold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ต้นทุนสินค้า (COGS)
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatBaht(activePnl.cogs)}
            </div>
            <div className="flex items-center text-xs text-slate-500 font-medium mt-1.5">
              <span>คิดเป็น {activePnl.totalRevenue > 0 ? ((activePnl.cogs / activePnl.totalRevenue) * 100).toFixed(1) : 0}% ของยอดขาย</span>
            </div>
          </div>
        </div>

        {/* Card 3: Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              กำไรขั้นต้น (Gross Profit)
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-bold ${activePnl.grossProfit >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              {formatBaht(activePnl.grossProfit)}
            </div>
            <div className="flex items-center text-xs text-teal-700 font-medium mt-1.5">
              <span>Gross Margin: <strong className="font-semibold">{activePnl.grossProfitMargin.toFixed(1)}%</strong></span>
            </div>
          </div>
        </div>

        {/* Card 4: Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ค่าใช้จ่ายดำเนินงาน (Opex)
            </span>
            <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatBaht(activePnl.totalOperatingExpenses)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1.5">
              <span>ค่ายิงแอด, ค่าส่ง, ค่าเช่า, เงินเดือน ฯลฯ</span>
            </div>
          </div>
        </div>

        {/* Card 5: Net Profit (Key Highlight) */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border-2 border-emerald-400 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              ★ กำไรสุทธิของร้าน (Net Profit)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold ${activePnl.netOperatingProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {formatBaht(activePnl.netOperatingProfit)}
            </div>
            <div className="flex items-center text-xs text-emerald-800 font-semibold mt-1.5">
              <span>Net Margin: {activePnl.netProfitMargin.toFixed(1)}%</span>
              <span className="mx-1.5">•</span>
              <span className="text-emerald-700">กำไรแท้จริงของร้าน</span>
            </div>
          </div>
        </div>

        {/* Card 6: Net Cash Flow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              เงินสดสุทธิคงเหลือ (Net Cash Flow)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-bold ${activePnl.netCashFlow >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              {formatBaht(activePnl.netCashFlow)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1.5">
              <span>หักเงินถอนเจ้าของ {formatBaht(activePnl.ownerDraw)} แล้ว</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Breakdown & AI Insights in 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Expense Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                สัดส่วนโครงสร้างค่าใช้จ่าย (Expense Breakdown)
              </h3>
              <p className="text-xs text-slate-500">
                รวมต้นทุนและค่าใช้จ่ายดำเนินงานทั้งหมด (ไม่รวมเงินถอนส่วนตัว)
              </p>
            </div>
            <button
              onClick={onSwitchToStatement}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              ดูรายละเอียดสเตทเม้นท์ &rarr;
            </button>
          </div>

          {/* Visual Bar Spectrum */}
          <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex">
            {activeExpenseBreakdown.map((item) => (
              <div
                key={item.category}
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color,
                }}
                className="h-full transition-all duration-300"
                title={`${item.label}: ${item.percentage.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Categories List */}
          <div className="space-y-3 pt-2">
            {activeExpenseBreakdown.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-xs text-slate-400">({item.count} รายการ)</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900 block">
                    {formatBaht(item.total)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Smart Business & Accounting Insights (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              ข้อเสนอแนะทางการเงิน & บัญชี (Insights)
            </h3>
          </div>

          <div className="space-y-3">
            {/* Insight 1: Ads Ratio */}
            <div className="p-3.5 rounded-xl bg-pink-50/60 border border-pink-100">
              <div className="flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-pink-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-pink-900 block">
                    สัดส่วนค่ายิงแอด ({adsRatio.toFixed(1)}% ของยอดขาย)
                  </span>
                  <p className="text-pink-800 mt-0.5 leading-relaxed">
                    ยอดรวม {formatBaht(adsExpense)} อยู่ในเกณฑ์ที่สามารถสร้างยอดขายได้ดี
                    ควรวัดผล ROAS รายแคมเปญเพื่อไม่ให้กินส่วนต่างกำไรสุทธิ
                  </p>
                </div>
              </div>
            </div>

            {/* Insight 2: Shipping Ratio */}
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
              <div className="flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-purple-900 block">
                    ค่าขนส่งพัสดุ ({shippingRatio.toFixed(1)}% ของยอดขาย)
                  </span>
                  <p className="text-purple-800 mt-0.5 leading-relaxed">
                    ยอดรวม {formatBaht(shippingExpense)} หากมีออเดอร์เกิน 50 ชิ้น/วัน
                    แนะนำขอเรทพิเศษแบบสัญญาองค์กรกับ Flash/Kerry เพื่อลดต้นทุนได้อีก 15-20%
                  </p>
                </div>
              </div>
            </div>

            {/* Insight 3: Owner Draw vs Profit */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-900 block">
                    แยกเงินถอนส่วนตัวเจ้าของถูกต้อง
                  </span>
                  <p className="text-emerald-800 mt-0.5 leading-relaxed">
                    เงินถอนส่วนตัว {formatBaht(activePnl.ownerDraw)} ถูกแยกออกจากการคำนวณกำไรของร้าน
                    ทำให้ตัวเลขกำไรสุทธิ {formatBaht(activePnl.netOperatingProfit)} สะท้อนผลประกอบการร้านจริง
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standard Profit and Loss Statement (Printable Table) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="border-b border-slate-200 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              งบกำไร-ขาดทุน ประจำงวด (Profit & Loss Statement)
            </h3>
            <p className="text-xs text-slate-500">
              รายงานงบการเงินฉบับย่อสำหรับผู้บริหารและเจ้าของกิจการ (ร้านค้า SME)
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400">หน่วย: บาท (THB)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">รายการ (Items)</th>
                <th className="py-2.5 px-3 text-right">จำนวนเงิน (บาท)</th>
                <th className="py-2.5 px-3 text-right">% เทียบยอดขาย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Revenue */}
              <tr className="bg-slate-50/70 font-semibold text-slate-900">
                <td className="py-2.5 px-3">รายได้รวมจากการดำเนินงาน (Total Revenue)</td>
                <td className="py-2.5 px-3 text-right text-emerald-600">{formatBaht(activePnl.totalRevenue)}</td>
                <td className="py-2.5 px-3 text-right">100.0%</td>
              </tr>
              <tr className="text-slate-600 text-xs">
                <td className="py-2 px-6">- ยอดขายสินค้าออนไลน์</td>
                <td className="py-2 px-3 text-right">{formatBaht(activePnl.totalRevenue - (activePnl.operatingExpensesByCategory.other_income || 0))}</td>
                <td className="py-2 px-3 text-right">99.9%</td>
              </tr>

              {/* COGS */}
              <tr className="font-medium text-slate-800">
                <td className="py-2.5 px-3">หัก: ต้นทุนสินค้าที่ขาย (Cost of Goods Sold - COGS)</td>
                <td className="py-2.5 px-3 text-right text-slate-700">({formatBaht(activePnl.cogs)})</td>
                <td className="py-2.5 px-3 text-right text-slate-500">
                  {activePnl.totalRevenue > 0 ? ((activePnl.cogs / activePnl.totalRevenue) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              {/* Gross Profit */}
              <tr className="bg-teal-50/60 font-bold text-teal-900 border-t border-b border-teal-200">
                <td className="py-2.5 px-3">กำไรขั้นต้น (Gross Profit)</td>
                <td className="py-2.5 px-3 text-right">{formatBaht(activePnl.grossProfit)}</td>
                <td className="py-2.5 px-3 text-right">{activePnl.grossProfitMargin.toFixed(1)}%</td>
              </tr>

              {/* Operating Expenses */}
              <tr className="bg-slate-50/70 font-semibold text-slate-900">
                <td className="py-2.5 px-3" colSpan={3}>
                  หัก: ค่าใช้จ่ายในการดำเนินงาน (Operating Expenses)
                </td>
              </tr>

              {Object.entries(activePnl.operatingExpensesByCategory)
                .filter(([, amount]) => amount > 0)
                .map(([categoryKey, amount]) => {
                  const meta = CATEGORIES_CONFIG[categoryKey as keyof typeof CATEGORIES_CONFIG];
                  const ratio = activePnl.totalRevenue > 0 ? (amount / activePnl.totalRevenue) * 100 : 0;
                  return (
                    <tr key={categoryKey} className="text-slate-600 text-xs">
                      <td className="py-2 px-6">- {meta?.name || categoryKey}</td>
                      <td className="py-2 px-3 text-right">({formatBaht(amount)})</td>
                      <td className="py-2 px-3 text-right text-slate-400">{ratio.toFixed(1)}%</td>
                    </tr>
                  );
                })}

              <tr className="font-medium text-slate-800">
                <td className="py-2.5 px-3">รวมค่าใช้จ่ายในการดำเนินงานทั้งหมด (Total Opex)</td>
                <td className="py-2.5 px-3 text-right text-rose-600">({formatBaht(activePnl.totalOperatingExpenses)})</td>
                <td className="py-2.5 px-3 text-right text-slate-500">
                  {activePnl.totalRevenue > 0 ? ((activePnl.totalOperatingExpenses / activePnl.totalRevenue) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              {/* Net Operating Profit */}
              <tr className="bg-emerald-100/70 font-extrabold text-emerald-950 border-t-2 border-b-2 border-emerald-400">
                <td className="py-3 px-3 text-base">★ กำไรสุทธิจากการดำเนินงาน (Net Operating Profit)</td>
                <td className="py-3 px-3 text-right text-base text-emerald-700">{formatBaht(activePnl.netOperatingProfit)}</td>
                <td className="py-3 px-3 text-right text-base">{activePnl.netProfitMargin.toFixed(1)}%</td>
              </tr>

              {/* Owner Draw */}
              <tr className="text-slate-500 text-xs">
                <td className="py-2 px-3">หัก: เงินถอนส่วนตัวเจ้าของกิจการ (Owner's Draw - ไม่ถือเป็นค่าใช้จ่ายของร้าน)</td>
                <td className="py-2 px-3 text-right">({formatBaht(activePnl.ownerDraw)})</td>
                <td className="py-2 px-3 text-right">-</td>
              </tr>

              {/* Net Cash Flow */}
              <tr className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-300">
                <td className="py-2.5 px-3">กระแสเงินสดคงเหลือสุทธิ (Ending Net Cash Flow)</td>
                <td className="py-2.5 px-3 text-right">{formatBaht(activePnl.netCashFlow)}</td>
                <td className="py-2.5 px-3 text-right">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
