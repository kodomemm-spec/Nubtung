import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import { AccountingCategory, StatementType, Transaction, TransactionType } from "../types";
import { CATEGORIES_CONFIG } from "../data/categories";
import { ToastType } from "./Toast";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Transaction) => void;
  showToast: (message: string, type?: ToastType) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  showToast,
}) => {
  const [type, setType] = useState<TransactionType>("in");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [channel, setChannel] = useState<string>("PromptPay QR");
  const [category, setCategory] = useState<AccountingCategory>("sales_revenue");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [statementType, setStatementType] = useState<StatementType>("bank");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast("กรุณากรอกจำนวนเงินให้ถูกต้อง", "error");
      return;
    }
    if (!description.trim()) {
      showToast("กรุณากรอกรายละเอียดรายการ", "error");
      return;
    }

    const newTx: Transaction = {
      id: `tx-man-${Date.now()}`,
      date,
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      type,
      amount: numAmount,
      description: description.trim(),
      channel,
      category,
      categoryLabel: CATEGORIES_CONFIG[category]?.name || category,
      confidence: 1.0,
      matchedRule: "บันทึกด้วยตนเอง (Manual Entry)",
      status: "verified",
      statementType,
    };

    onAddTransaction(newTx);
    onClose();
  };

  const availableCategories = Object.values(CATEGORIES_CONFIG).filter(
    (c) => (type === "in" ? c.type === "in" : c.type === "out")
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">เพิ่มรายการบัญชีใหม่</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Type Toggle: In / Out */}
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">ประเภทรายการ</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType("in");
                  setCategory("sales_revenue");
                }}
                className={`py-2 text-center rounded-xl font-semibold border transition-all cursor-pointer ${
                  type === "in"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                + เงินเข้า (รายรับ / ยอดขาย)
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("out");
                  setCategory("cogs");
                }}
                className={`py-2 text-center rounded-xl font-semibold border transition-all cursor-pointer ${
                  type === "out"
                    ? "bg-rose-50 text-rose-700 border-rose-300 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                - เงินออก (ต้นทุน / ค่าใช้จ่าย)
              </button>
            </div>
          </div>

          {/* Statement Type Toggle: Bank / Credit Card */}
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">มาจากสเตทเม้นท์ไหน</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatementType("bank")}
                className={`py-2 text-center rounded-xl font-semibold border transition-all cursor-pointer ${
                  statementType === "bank"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ธนาคาร
              </button>

              <button
                type="button"
                onClick={() => setStatementType("credit_card")}
                className={`py-2 text-center rounded-xl font-semibold border transition-all cursor-pointer ${
                  statementType === "credit_card"
                    ? "bg-violet-50 text-violet-700 border-violet-300 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                บัตรเครดิต
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-lg font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              รายละเอียดรายการ / บันทึก <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ขายชุดเซ็ต #8821, ซื้อของสต็อก, จ่ายค่าส่ง Flash"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Category Select */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">หมวดหมู่บัญชี</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AccountingCategory)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Channel and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">ช่องทางชำระเงิน</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="PromptPay QR">PromptPay QR</option>
                <option value="Mobile Banking">Mobile Banking</option>
                <option value="Debit Card">บัตรเดบิต / บัตรเครดิต</option>
                <option value="Cash">เงินสด (Cash)</option>
                <option value="Direct Transfer">โอนผ่านธนาคาร</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">วันที่ทำรายการ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-xs"
            >
              บันทึกรายการ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
