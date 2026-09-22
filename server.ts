import express from "express";
import path from "path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with increased limit for base64 images
app.use(express.json({ limit: "25mb" }));

// Lazy Gemini AI initialization
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Built-in rule-based classifier (instant fallback & augmentation)
function ruleBasedCategorize(description: string, channel: string, type: "in" | "out", amount: number) {
  const text = `${description} ${channel}`.toLowerCase();
  
  if (type === "in") {
    if (text.includes("interest") || text.includes("ดอกเบี้ย")) {
      return { category: "other_income", label: "รายรับอื่นๆ (ดอกเบี้ย)", confidence: 0.95, matchedRule: "ตรวจพบดอกเบี้ย" };
    }
    if (text.includes("service") || text.includes("บริการ")) {
      return { category: "service_revenue", label: "รายได้ค่าบริการ", confidence: 0.9, matchedRule: "ตรวจพบคีย์เวิร์ดบริการ" };
    }
    return { category: "sales_revenue", label: "ยอดขายสินค้า (Sales Revenue)", confidence: 0.92, matchedRule: "เงินโอนเข้าปกติ / PromptPay" };
  } else {
    // Money out (Expense / Cost)
    if (text.includes("meta") || text.includes("facebook") || text.includes("tiktok") || text.includes("google ads") || text.includes("adspower") || text.includes("ads")) {
      return { category: "marketing_ads", label: "ค่ายิงแอด / โฆษณาการตลาด", confidence: 0.98, matchedRule: "แพลตฟอร์มโฆษณาออนไลน์ (Meta/TikTok/Google)" };
    }
    if (text.includes("flash") || text.includes("kerry") || text.includes("j&t") || text.includes("jt express") || text.includes("thailand post") || text.includes("ไปรษณีย์") || text.includes("nim express") || text.includes("shopee xpress")) {
      return { category: "shipping_logistics", label: "ค่าขนส่งพัสดุ (Logistics)", confidence: 0.98, matchedRule: "บริษัทขนส่งพัสดุ" };
    }
    if (text.includes("supplier") || text.includes("โรงงาน") || text.includes("สำเพ็ง") || text.includes("restock") || text.includes("wholesales") || text.includes("วัตถุดิบ") || text.includes("สินค้า") || text.includes("สต็อก") || text.includes("1688") || text.includes("taoba")) {
      return { category: "cogs", label: "ต้นทุนสินค้า (COGS)", confidence: 0.95, matchedRule: "ซื้อสต็อก / สั่งของโรงงาน" };
    }
    if (text.includes("pack") || text.includes("box") || text.includes("กล่อง") || text.includes("bubble") || text.includes("บับเบิ้ล") || text.includes("เทป") || text.includes("ซอง")) {
      return { category: "packaging_supplies", label: "อุปกรณ์แพ็คของ / กล่องพัสดุ", confidence: 0.94, matchedRule: "อุปกรณ์หีบห่อพัสดุ" };
    }
    if (text.includes("rent") || text.includes("ค่าเช่า") || text.includes("การไฟฟ้า") || text.includes("mea") || text.includes("pea") || text.includes("การประปา") || text.includes("mwa") || text.includes("ais") || text.includes("true") || text.includes("3bb") || text.includes("อินเทอร์เน็ต")) {
      return { category: "utilities_rent", label: "ค่าเช่า / ค่าน้ำ-ค่าไฟ-เน็ต", confidence: 0.96, matchedRule: "สาธารณูปโภคและสถานที่" };
    }
    if (text.includes("salary") || text.includes("เงินเดือน") || text.includes("wage") || text.includes("ค่าจ้าง") || text.includes("bonus") || text.includes("โอที") || text.includes("ot")) {
      return { category: "salary_wage", label: "เงินเดือน / ค่าจ้างพนักงาน", confidence: 0.95, matchedRule: "เงินเดือนและค่าตอบแทน" };
    }
    if (text.includes("fee") || text.includes("ธรรมเนียม") || text.includes("charge") || text.includes("sms fee") || text.includes("annual fee")) {
      return { category: "bank_fees", label: "ค่าธรรมเนียมธนาคาร", confidence: 0.99, matchedRule: "ค่าธรรมเนียมบริการทางการเงิน" };
    }
    if (text.includes("draw") || text.includes("ถอนเงินส่วนตัว") || text.includes("ปันผล") || text.includes("เงินส่วนตัว")) {
      return { category: "owner_draw", label: "เงินถอนส่วนตัวของเจ้าของ (Owner's Draw)", confidence: 0.92, matchedRule: "ถอนเงินส่วนตัว" };
    }
    if (text.includes("สรรพากร") || text.includes("tax") || text.includes("ภ.ง.ด") || text.includes("ภพ.30") || text.includes("wht")) {
      return { category: "taxes", label: "ภาษีและอากร (Taxes)", confidence: 0.97, matchedRule: "ชำระภาษีหน่วยงานรัฐ" };
    }
    
    // Default fallback based on amount threshold or general
    if (amount > 10000) {
      return { category: "cogs", label: "ต้นทุนสินค้า (COGS)", confidence: 0.65, matchedRule: "ยอดจ่ายสูง อนุมานเป็นซื้อสินค้าเข้าร้าน" };
    }
    return { category: "miscellaneous", label: "ค่าใช้จ่ายเบ็ดเตล็ด (Misc Expenses)", confidence: 0.6, matchedRule: "รายการทั่วไป รอผู้ใช้ตรวจสอบ" };
  }
}

// 1. Health check & status
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 2. Batch Categorize Bank Statement Transactions
app.post("/api/ai/categorize-transactions", async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: "transactions must be an array" });
    }

    const ai = getGenAI();

    // Fast-path: run rule-based classifier first
    const classifiedWithRules = transactions.map((tx: any) => {
      const ruleResult = ruleBasedCategorize(tx.description || "", tx.channel || "", tx.type, Number(tx.amount));
      return {
        id: tx.id,
        ...ruleResult,
      };
    });

    // If Gemini is available, enhance items with low confidence (< 0.8)
    const lowConfidenceItems = classifiedWithRules.filter((item) => item.confidence < 0.8);

    if (ai && lowConfidenceItems.length > 0) {
      try {
        const prompt = `คุณคือผู้สอบบัญชีภาษีอากรและนักบัญชีบริหารธุรกิจ SME ในไทย
ช่วยจัดหมวดหมู่รายการเดินบัญชีที่ไม่ชัดเจนต่อไปนี้:
หมวดหมู่ที่ใช้ได้:
- sales_revenue: รายได้จากการขายสินค้า
- service_revenue: รายได้ค่าบริการ
- cogs: ต้นทุนสินค้า ซื้อของมาขาย วัตถุดิบ
- shipping_logistics: ค่าส่งพัสดุ (Flash, Kerry, J&T, ไปรษณีย์)
- marketing_ads: ค่าโฆษณาออนไลน์ (Meta, TikTok, Google)
- utilities_rent: ค่าเช่า น้ำไฟ อินเทอร์เน็ต
- salary_wage: เงินเดือน ค่าจ้าง
- packaging_supplies: กล่องพัสดุ เทป อุปกรณ์แพ็ค
- bank_fees: ค่าธรรมเนียมธนาคาร
- owner_draw: ถอนเงินส่วนตัวของเจ้าของ
- taxes: ภาษีต่างๆ
- miscellaneous: ค่าใช้จ่ายเบ็ดเตล็ด

รายการที่ต้องการจัดหมวด:
${JSON.stringify(
  lowConfidenceItems.map((item) => {
    const orig = transactions.find((t: any) => t.id === item.id);
    return { id: item.id, description: orig?.description, channel: orig?.channel, amount: orig?.amount, type: orig?.type };
  })
)}

ตอบเป็น JSON อาร์เรย์ของอ็อบเจกต์ที่มี { id, category, label, confidence, matchedRule }`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: { type: Type.STRING },
                  label: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  matchedRule: { type: Type.STRING },
                },
                required: ["id", "category", "label"],
              },
            },
          },
        });

        const aiUpdates: any[] = JSON.parse(response.text || "[]");
        const aiMap = new Map(aiUpdates.map((u) => [u.id, u]));

        // Merge AI enhancement
        const merged = classifiedWithRules.map((item) => {
          if (aiMap.has(item.id)) {
            const aiItem = aiMap.get(item.id);
            return {
              ...item,
              ...aiItem,
              enhancedByAI: true,
            };
          }
          return item;
        });

        return res.json({
          success: true,
          results: merged,
        });
      } catch (aiErr) {
        console.warn("Gemini batch categorization encountered error, using rule-based fallback:", aiErr);
      }
    }

    return res.json({
      success: true,
      results: classifiedWithRules,
    });
  } catch (err: any) {
    console.error("Error in /api/ai/categorize-transactions:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to categorize transactions",
    });
  }
});

// Helper to unlock password-protected PDF or verify decryptability using Ghostscript
function unlockPdf(
  buffer: Buffer,
  password = ""
): { success: boolean; buffer?: Buffer; needPassword?: boolean; isIncorrect?: boolean; error?: string } {
  const tmpId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpIn = `/tmp/in_${tmpId}.pdf`;
  const tmpOut = `/tmp/out_${tmpId}.pdf`;
  fs.writeFileSync(tmpIn, buffer);

  try {
    const pwArg = password ? `-sPDFPassword=${JSON.stringify(password)}` : "";
    const cmd = `gs -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite ${pwArg} -sOutputFile=${tmpOut} ${tmpIn} 2>&1`;
    execSync(cmd, { stdio: "pipe" });
    const unlockedBuffer = fs.readFileSync(tmpOut);
    try { fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut); } catch (_) {}
    return { success: true, buffer: unlockedBuffer };
  } catch (err: any) {
    const msg = (err.stdout ? err.stdout.toString() : "") + (err.stderr ? err.stderr.toString() : "") + (err.message || "");
    try { fs.unlinkSync(tmpIn); } catch (_) {}
    try { fs.unlinkSync(tmpOut); } catch (_) {}
    const lower = msg.toLowerCase();
    if (lower.includes("password") || lower.includes("permission") || lower.includes("encrypted") || lower.includes("cannot decrypt")) {
      return { success: false, needPassword: true, isIncorrect: Boolean(password) };
    }
    // If gs fails for another non-encryption reason, fallback to original buffer
    return { success: true, buffer };
  }
}

// Normalize various date formats (including Thai Buddhist Era) to ISO YYYY-MM-DD
function normalizeDateToIso(dateStr: string): string {
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

// Helper for extracting text from PDF (supports password-protected statements)
async function extractPdfText(buffer: Buffer, password?: string): Promise<{ numPages: number; text: string }> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    password: password || undefined,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdfDocument = await loadingTask.promise;
  let fullText = "";
  const numPages = pdfDocument.numPages;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by vertical Y-coordinate to reconstruct rows/lines
    const valid = (textContent.items || []).filter(
      (it: any) => "str" in it && typeof it.str === "string" && it.str.trim().length > 0
    );

    // In PDF coordinate space, Y is distance from the bottom.
    // Higher Y is closer to the top of the page.
    // So we sort descending by Y (top to bottom).
    // Within the same horizontal line (within 5px), sort ascending by X (left to right).
    valid.sort((a: any, b: any) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 5) {
        return yDiff;
      }
      return a.transform[4] - b.transform[4];
    });

    const pageLines: string[] = [];
    let currentLine: string[] = [];
    let currentY: number | null = null;

    for (const item of valid as any[]) {
      const y = item.transform[5];
      if (currentY === null || Math.abs(currentY - y) <= 5) {
        currentLine.push(item.str.trim());
        if (currentY === null) currentY = y;
      } else {
        pageLines.push(currentLine.join(" "));
        currentLine = [item.str.trim()];
        currentY = y;
      }
    }
    if (currentLine.length > 0) {
      pageLines.push(currentLine.join(" "));
    }

    fullText += `--- หน้า ${pageNum} ---\n` + pageLines.join("\n") + "\n\n";
  }

  return {
    numPages,
    text: fullText.trim(),
  };
}

// Smart Thai Bank Statement Parser (robust parser for SCB, KBANK, KTB, BBL, TTB)
function parseThaiBankStatement(pdfText: string): {
  bankName: string;
  accountNumber: string;
  transactions: any[];
} {
  let detectedBank = "ไทยพาณิชย์ (SCB)";
  let detectedAccount = "";
  const lower = pdfText.toLowerCase();

  if (lower.includes("siam commercial") || lower.includes("ไทยพาณิชย์") || lower.includes("scb") || lower.includes("x1") || lower.includes("x2")) {
    detectedBank = "ไทยพาณิชย์ (SCB)";
  } else if (lower.includes("kasikorn") || lower.includes("กสิกร") || lower.includes("kbank") || lower.includes("k plus")) {
    detectedBank = "กสิกรไทย (KBANK)";
  } else if (lower.includes("krungthai") || lower.includes("กรุงไทย") || lower.includes("ktb")) {
    detectedBank = "กรุงไทย (KTB)";
  } else if (lower.includes("bangkok bank") || lower.includes("กรุงเทพ") || lower.includes("bbl")) {
    detectedBank = "กรุงเทพ (BBL)";
  } else if (lower.includes("ttb") || lower.includes("tmb") || lower.includes("ทหารไทยธนชาต")) {
    detectedBank = "ทีทีบี (TTB)";
  }

  const accMatch = pdfText.match(/(?:account\s*no\.?|เลขที่บัญชี|เลขบัญชี)[\s:]*([0-9xX-]{9,16})/i);
  if (accMatch) {
    detectedAccount = accMatch[1].trim();
  }

  const lines = pdfText.split("\n");
  const transactions: any[] = [];

  const thaiMonths: Record<string, number> = {
    "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6,
    "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
  };

  const amountRegex = /[-+]?\b\d{1,3}(,\d{3})*(\.\d{2})\b/g;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 8) return;
    if (
      trimmed.includes("--- หน้า") ||
      trimmed.includes("Balance Forward") ||
      trimmed.includes("ยอดยกมา") ||
      trimmed.includes("รวมทั้งสิ้น") ||
      trimmed.includes("Total Amount") ||
      trimmed.includes("Page ")
    ) {
      return;
    }

    // 1. Check date
    let formattedDate = "";
    let matchedDateStr = "";

    // Try numeric date: DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, YYYY-MM-DD
    const numDateMatch = trimmed.match(/\b([0-3]?[0-9])[-/.]([0-1]?[0-9])[-/.](20\d{2}|25\d{2}|\d{2})\b/);
    const thaiMonthMatch = trimmed.match(/\b([0-3]?[0-9])\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(25\d{2}|20\d{2}|\d{2})\b/);

    if (numDateMatch) {
      matchedDateStr = numDateMatch[0];
      const d = parseInt(numDateMatch[1], 10);
      const mon = parseInt(numDateMatch[2], 10);
      let y = parseInt(numDateMatch[3], 10);
      if (y > 2400) y -= 543;
      else if (y >= 50 && y < 100) y = (2500 + y) - 543;
      else if (y < 50) y = 2000 + y;
      formattedDate = `${y}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    } else if (thaiMonthMatch) {
      matchedDateStr = thaiMonthMatch[0];
      const d = parseInt(thaiMonthMatch[1], 10);
      const mon = thaiMonths[thaiMonthMatch[2]] || 1;
      let y = parseInt(thaiMonthMatch[3], 10);
      if (y > 2400) y -= 543;
      else if (y >= 50 && y < 100) y = (2500 + y) - 543;
      else if (y < 50) y = 2000 + y;
      formattedDate = `${y}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }

    if (!formattedDate) return;

    // 2. Check time
    const timeMatch = trimmed.match(/\b([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?\b/);
    const time = timeMatch ? timeMatch[0] : "";

    // 3. Extract amounts
    const amounts: { val: number; raw: string }[] = [];
    let amMatch;
    amountRegex.lastIndex = 0;
    while ((amMatch = amountRegex.exec(trimmed)) !== null) {
      const val = parseFloat(amMatch[0].replace(/,/g, ""));
      if (!isNaN(val) && Math.abs(val) > 0) {
        amounts.push({ val, raw: amMatch[0] });
      }
    }

    if (amounts.length === 0) return;

    const txAmount = Math.abs(amounts[0].val);
    if (txAmount <= 0) return;

    // 4. In vs Out
    let type: "in" | "out" = "in";
    if (
      trimmed.includes("X2") ||
      trimmed.includes("CW") ||
      trimmed.includes("ATS") ||
      trimmed.includes("PMT") ||
      trimmed.includes("FE") ||
      trimmed.includes("BC") ||
      trimmed.includes("DR") ||
      trimmed.includes("ถอน") ||
      trimmed.includes("โอนออก") ||
      trimmed.includes("debit") ||
      trimmed.includes("ชำระ") ||
      trimmed.includes("จ่าย") ||
      trimmed.includes("fee") ||
      amounts[0].raw.startsWith("-")
    ) {
      type = "out";
    } else if (
      trimmed.includes("X1") ||
      trimmed.includes("CD") ||
      trimmed.includes("SD") ||
      trimmed.includes("CR") ||
      trimmed.includes("ฝาก") ||
      trimmed.includes("โอนเข้า") ||
      trimmed.includes("deposit") ||
      trimmed.includes("credit") ||
      amounts[0].raw.startsWith("+")
    ) {
      type = "in";
    }

    // 5. Clean description
    let cleanDesc = trimmed
      .replace(matchedDateStr, "")
      .replace(time, "")
      .replace(/[-+]?\b\d{1,3}(,\d{3})*(\.\d{2})\b/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!cleanDesc || cleanDesc.length < 3) {
      cleanDesc = type === "in" ? "เงินโอนเข้าบัญชี (Statement)" : "เงินโอนออก / ชำระเงิน (Statement)";
    }

    const rule = ruleBasedCategorize(cleanDesc, detectedBank, type, txAmount);

    transactions.push({
      date: formattedDate,
      time,
      description: cleanDesc.slice(0, 90),
      channel: detectedBank,
      type,
      amount: txAmount,
      category: rule.category,
      aiReasoning: rule.matchedRule || rule.label,
    });
  });

  return {
    bankName: detectedBank,
    accountNumber: detectedAccount,
    transactions,
  };
}

// 3. Parse Bank Statement PDF using Gemini 2.5 Flash Multimodal (with native PDF inlineData & fallback)
app.post("/api/ai/parse-statement-pdf", async (req, res) => {
  try {
    const { pdfBase64, password = "" } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: "กรุณาแนบไฟล์ PDF" });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(cleanBase64, "base64");

    // 1. Unlock / verify PDF decryptability (e.g. SCB, KBANK password-protected statements)
    const unlockRes = unlockPdf(pdfBuffer, password);
    if (!unlockRes.success) {
      return res.json({
        success: false,
        needPassword: true,
        isIncorrectPassword: unlockRes.isIncorrect,
        message: unlockRes.isIncorrect
          ? "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบวันเกิด (ววดดปปปป เช่น 15082535) หรือเลขบัตรประชาชน 4 ตัวท้ายอีกครั้ง"
          : "ไฟล์ Statement PDF นี้ติดรหัสผ่านจากธนาคาร กรุณากรอกรหัสผ่านเพื่อปลดล็อกและให้ AI อ่านข้อมูล",
      });
    }

    const effectiveBuffer = unlockRes.buffer || pdfBuffer;
    const effectiveBase64 = effectiveBuffer.toString("base64");

    // 2. Try to get page count & secondary text layer
    let pdfText = "";
    let numPages = 1;
    try {
      const extracted = await extractPdfText(effectiveBuffer);
      pdfText = extracted.text;
      numPages = extracted.numPages || 1;
    } catch (e: any) {
      console.warn("Text layer extraction had minor notice, relying on multimodal document vision:", e?.message);
    }

    const ai = getGenAI();
    let parsedResult: any = null;
    let usedSource = "gemini-2.5-flash";
    let noticeMessage = "";

    if (ai) {
      const prompt = `คุณคือนักบัญชีผู้เชี่ยวชาญด้านการวิเคราะห์ Bank Statement ธนาคารไทย (เช่น ไทยพาณิชย์ SCB, กสิกรไทย KBANK, กรุงไทย NEXT, กรุงเทพ Bualuang, ทีทีบี TTB, ออมสิน GSB ฯลฯ)
โปรดอ่านและตรวจสอบเอกสาร Bank Statement ในไฟล์ PDF ฉบับนี้อย่างละเอียด (${numPages} หน้า) และดึงข้อมูลรายการเดินบัญชีทุกแถวในตารางออกมาเป็น JSON

คำแนะนำสำคัญในการอ่านและสกัดรายการ:
1. bankName: ระบุชื่อธนาคารภาษาไทย เช่น "ไทยพาณิชย์ (SCB)", "กสิกรไทย (KBANK)", "กรุงไทย (KTB)", "กรุงเทพ (BBL)", "ทีทีบี (TTB)"
2. accountNumber: เลขที่บัญชีที่ระบุในหัวเอกสาร
3. accountName: ชื่อเจ้าของบัญชี
4. period: ช่วงเวลาของ Statement เช่น 01/08/2026 - 31/08/2026
5. transactions: รายการเดินบัญชีทุกรายการที่มีในตาราง:
   - date: วันที่ทำรายการ รูปแบบ YYYY-MM-DD เสมอ เช่น "2026-08-01" (หากในเอกสารเป็น พ.ศ. เช่น 2567/2568/2569 หรือ 67/68/69 ให้แปลงเป็น ค.ศ. เช่น 2024/2025/2026 เสมอ)
   - time: เวลาทำรายการ รูปแบบ HH:mm (เช่น 10:15, 14:30) ถ้าไม่มีให้ใส่ ""
   - description: รายละเอียดรายการ เช่น "โอนเงินเข้า บัญชีพร้อมเพย์", "ชำระค่าสินค้า", "ATS ค่าธรรมเนียม SMS", "ถอนเงินสด ATM", "โอนไปบัญชี xxx"
   - channel: ช่องทางหรือรหัสทำรายการ เช่น "X1", "X2", "ATS", "SCB EASY", "PromptPay", "K PLUS", "CDM", "EDC"
   - type: ระบุ "in" (เงินเข้า/ยอดฝาก/Credit/CR/โอนเข้า) หรือ "out" (เงินออก/ยอดถอน/Debit/DR/จ่ายเงิน/หักบัญชี)
     * สำหรับ SCB: ช่องถอนเงิน (Withdrawal) หรือรหัส X2, ATS, CW คือ "out"; ช่องฝากเงิน (Deposit) หรือรหัส X1, CD, SD คือ "in"
     * ตรวจสอบคอลัมน์ Withdrawal/ถอนเงิน และ Deposit/ฝากเงิน ให้แม่นยำ
   - amount: จำนวนเงินของรายการนั้น เป็นตัวเลขบวกทศนิยมเสมอ (เช่น 1500.00, 20.00) ห้ามใส่ค่าติดลบ
   - category: เลือกหมวดหมู่บัญชีร้านค้าที่เหมาะสมที่สุด:
     sales_revenue, service_revenue, other_income, cogs, packaging_supplies, shipping_logistics, marketing_ads, utilities_rent, salary_wage, bank_fees, owner_draw, taxes, miscellaneous
   - aiReasoning: เหตุผลสั้นๆ ในการจัดหมวดหมู่นี้
${pdfText.trim() ? `\n(ข้อความตรวจพบเพิ่มเติมจากไฟล์:)\n${pdfText.slice(0, 15000)}` : ""}`;

      const geminiContents = [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: effectiveBase64,
          },
        },
        prompt,
      ];

      const callGeminiWithRetry = async (attempt = 1): Promise<any> => {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: geminiContents,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  bankName: { type: Type.STRING },
                  accountNumber: { type: Type.STRING },
                  accountName: { type: Type.STRING },
                  period: { type: Type.STRING },
                  transactions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        date: { type: Type.STRING },
                        time: { type: Type.STRING },
                        description: { type: Type.STRING },
                        channel: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["in", "out"] },
                        amount: { type: Type.NUMBER },
                        category: { type: Type.STRING },
                        aiReasoning: { type: Type.STRING },
                      },
                      required: ["date", "description", "type", "amount", "category"],
                    },
                  },
                },
                required: ["transactions"],
              },
            },
          });

          return JSON.parse(response.text || "{}");
        } catch (geminiError: any) {
          const errMsg = String(geminiError.message || "");
          const isHighDemand =
            errMsg.includes("503") ||
            errMsg.includes("high demand") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("429");

          if (isHighDemand && attempt < 2) {
            console.warn(`Gemini 2.5 Flash 503/429 high demand on attempt ${attempt}, retrying in 1.5s...`);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return callGeminiWithRetry(attempt + 1);
          }
          throw geminiError;
        }
      };

      try {
        parsedResult = await callGeminiWithRetry(1);
      } catch (err: any) {
        console.warn("Gemini 2.5 Flash unavailable (503/timeout), smoothly falling back to Smart Parser:", err.message);
        noticeMessage = "โมเดล AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว ระบบจึงสลับมาใช้ Smart Statement Engine ให้ทันทีเพื่อไม่ให้สะดุด";
        usedSource = "smart-parser-fallback";
      }
    } else {
      usedSource = "smart-parser-fallback";
    }

    // If Gemini succeeded and extracted transactions
    if (parsedResult && Array.isArray(parsedResult.transactions) && parsedResult.transactions.length > 0) {
      const sanitizedTransactions = parsedResult.transactions.map((tx: any) => ({
        date: normalizeDateToIso(tx.date),
        time: tx.time || "",
        description: tx.description || "รายการเดินบัญชี",
        channel: tx.channel || "Statement",
        type: tx.type === "in" ? "in" : "out",
        amount: Math.abs(Number(tx.amount) || 0),
        category: tx.category || (tx.type === "in" ? "sales_revenue" : "miscellaneous"),
        aiReasoning: tx.aiReasoning || "วิเคราะห์โดย AI จากสเตทเม้นท์ธนาคาร",
      }));

      return res.json({
        success: true,
        source: "gemini-2.5-flash",
        numPages,
        bankName: parsedResult.bankName || "ไทยพาณิชย์ (SCB)",
        accountNumber: parsedResult.accountNumber || "",
        accountName: parsedResult.accountName || "",
        period: parsedResult.period || "",
        transactions: sanitizedTransactions,
      });
    }

    // Seamless fallback to Smart Thai Statement Parser on text layer
    const fallbackData = parseThaiBankStatement(pdfText);

    return res.json({
      success: true,
      source: usedSource,
      notice: noticeMessage,
      numPages,
      bankName: fallbackData.bankName,
      accountNumber: fallbackData.accountNumber,
      accountName: "",
      period: "",
      transactions: fallbackData.transactions,
    });
  } catch (error: any) {
    console.error("Error in parse-statement-pdf:", error);
    return res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการประมวลผลไฟล์ PDF กรุณาลองใหม่อีกครั้ง",
    });
  }
});

// Start server with Vite middleware in development or static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NubTung server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
