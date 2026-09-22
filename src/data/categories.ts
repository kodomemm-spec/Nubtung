import { AccountingCategory, TransactionType } from "../types";

export interface CategoryMeta {
  key: AccountingCategory;
  name: string;
  shortName: string;
  type: TransactionType;
  group: "revenue" | "cogs" | "opex" | "equity";
  color: string; // Tailwind color class or hex
  badgeColor: string;
  description: string;
}

export const CATEGORIES_CONFIG: Record<AccountingCategory, CategoryMeta> = {
  sales_revenue: {
    key: "sales_revenue",
    name: "ยอดขายสินค้า (Sales Revenue)",
    shortName: "ขายสินค้า",
    type: "in",
    group: "revenue",
    color: "#10b981", // emerald-500
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "เงินโอนรับชำระค่าสินค้าจากลูกค้า",
  },
  service_revenue: {
    key: "service_revenue",
    name: "รายได้ค่าบริการ (Service Revenue)",
    shortName: "ค่าบริการ",
    type: "in",
    group: "revenue",
    color: "#06b6d4", // cyan-500
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    description: "รายรับจากการบริการ ค่าที่ปรึกษา ค่าคอมมิชชัน",
  },
  other_income: {
    key: "other_income",
    name: "รายรับอื่นๆ / ดอกเบี้ย (Other Income)",
    shortName: "รายรับอื่น",
    type: "in",
    group: "revenue",
    color: "#3b82f6", // blue-500
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    description: "ดอกเบี้ยเงินฝากธนาคาร เงินคืน แคชแบ็ก",
  },
  cogs: {
    key: "cogs",
    name: "ต้นทุนสินค้า (Cost of Goods Sold)",
    shortName: "ต้นทุนสินค้า",
    type: "out",
    group: "cogs",
    color: "#f97316", // orange-500
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    description: "ค่าสั่งซื้อสินค้าเข้าร้าน สต็อก วัตถุดิบ ค่าโรงงาน",
  },
  shipping_logistics: {
    key: "shipping_logistics",
    name: "ค่าขนส่งพัสดุ (Shipping & Logistics)",
    shortName: "ค่าส่งของ",
    type: "out",
    group: "opex",
    color: "#8b5cf6", // purple-500
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Flash Express, Kerry, J&T, ไปรษณีย์ไทย, Lalamove",
  },
  marketing_ads: {
    key: "marketing_ads",
    name: "ค่ายิงแอด / การตลาด (Marketing & Ads)",
    shortName: "ค่ายิงแอด",
    type: "out",
    group: "opex",
    color: "#ec4899", // pink-500
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
    description: "Meta Ads, TikTok Ads, Google Ads, Shopee/Lazada Ads",
  },
  utilities_rent: {
    key: "utilities_rent",
    name: "ค่าเช่า / น้ำ-ไฟ-เน็ต (Rent & Utilities)",
    shortName: "ค่าเช่า/น้ำไฟ",
    type: "out",
    group: "opex",
    color: "#eab308", // yellow-500
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    description: "ค่าเช่าออฟฟิศ/โกดัง ค่าน้ำ ค่าไฟ ค่าอินเทอร์เน็ต",
  },
  salary_wage: {
    key: "salary_wage",
    name: "เงินเดือน / ค่าจ้าง (Salaries & Wages)",
    shortName: "เงินเดือน/ค่าจ้าง",
    type: "out",
    group: "opex",
    color: "#6366f1", // indigo-500
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description: "เงินเดือนพนักงาน ค่าจ้างรายวัน แอดมิน แพ็คเกอร์ OT",
  },
  packaging_supplies: {
    key: "packaging_supplies",
    name: "อุปกรณ์แพ็คของ / กล่องพัสดุ (Packaging)",
    shortName: "กล่อง/แพ็คของ",
    type: "out",
    group: "opex",
    color: "#14b8a6", // teal-500
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    description: "กล่องลูกฟูก บับเบิ้ลกันกระแทก เทปใส สติกเกอร์",
  },
  bank_fees: {
    key: "bank_fees",
    name: "ค่าธรรมเนียมธนาคาร (Bank Fees)",
    shortName: "ค่าธรรมเนียม",
    type: "out",
    group: "opex",
    color: "#64748b", // slate-500
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    description: "ค่าธรรมเนียมโอน ค่า SMS Alert ค่ารักษาบัญชี",
  },
  owner_draw: {
    key: "owner_draw",
    name: "เงินถอนเจ้าของ (Owner's Draw)",
    shortName: "ถอนเงินส่วนตัว",
    type: "out",
    group: "equity",
    color: "#a855f7", // purple-600
    badgeColor: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    description: "เงินที่เจ้าของกิจการถอนไปใช้ส่วนตัว (ไม่นับเป็นค่าใช้จ่ายของร้าน)",
  },
  taxes: {
    key: "taxes",
    name: "ภาษีและอากร (Taxes)",
    shortName: "ภาษี",
    type: "out",
    group: "opex",
    color: "#ef4444", // red-500
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    description: "ภ.ง.ด. หัก ณ ที่จ่าย ภาษีมูลค่าเพิ่ม ค่าปรับ",
  },
  miscellaneous: {
    key: "miscellaneous",
    name: "ค่าใช้จ่ายเบ็ดเตล็ด (Miscellaneous)",
    shortName: "เบ็ดเตล็ด",
    type: "out",
    group: "opex",
    color: "#94a3b8", // slate-400
    badgeColor: "bg-gray-100 text-gray-700 border-gray-200",
    description: "ค่าใช้จ่ายทั่วไปอื่นๆ ค่ากาแฟรับรอง ค่าของใช้สำนักงาน",
  },
};
