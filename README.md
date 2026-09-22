# NubTung (นับตังค์)

ระบบบัญชีและวิเคราะห์กำไร-ขาดทุนสำหรับ SME ไทย อ่าน Statement ธนาคารและบัตรเครดิต จัดหมวดหมู่รายการอัตโนมัติด้วย AI สรุปงบกำไร-ขาดทุนสิ้นเดือน และ export เป็น Excel ได้ทันที

## Features

- **นำเข้า Statement** — วางข้อความที่ก๊อปปี้จาก PDF, นำเข้าไฟล์ CSV, หรือให้ AI (Gemini) อ่านไฟล์ PDF Statement ธนาคารโดยตรง (รองรับไฟล์ที่ติดรหัสผ่าน)
- **แยกสเตทเม้นท์ธนาคาร vs บัตรเครดิต** — แท็กแต่ละรายการว่ามาจากสเตทเม้นท์ไหน ดูสรุปเทียบกันเพื่อกระทบยอด (reconciliation) ตอนปิดงบสิ้นเดือน
- **จัดหมวดหมู่อัตโนมัติ** — Rule engine ภายใน + AI (Gemini) ช่วยจัดหมวดรายการที่ไม่มั่นใจ ปรับแก้ไขเองได้ทุกรายการ
- **งบกำไร-ขาดทุน (P&L Dashboard)** — สรุปรายรับ ต้นทุน ค่าใช้จ่าย กำไรขั้นต้น กำไรสุทธิ กระแสเงินสด พร้อมกราฟสัดส่วนค่าใช้จ่าย และดูแยกตามประเภทสเตทเม้นท์ได้
- **Export Excel** — ดาวน์โหลดรายการทั้งหมด (แยกชีทธนาคาร/บัตรเครดิต) พร้อมชีทสรุปงบกำไรขาดทุน เป็นไฟล์ .xlsx เปิดได้ทั้ง Excel และ Google Sheets

## Tech Stack

- React 19 + TypeScript + Vite + Tailwind CSS v4
- Express (`server.ts`) + Google Gemini API สำหรับอ่าน/จัดหมวดหมู่ Statement
- Bun เป็น package manager & runtime

## Run Locally

**Prerequisites:** [Bun](https://bun.sh)

1. Install dependencies:
   ```
   bun install
   ```
2. Copy `.env.example` เป็น `.env` แล้วใส่ `GEMINI_API_KEY` ของคุณ (ถ้าไม่ใส่ ระบบจะยังใช้งานได้ผ่าน rule-based fallback)
3. Run the dev server:
   ```
   bun run dev
   ```
4. Build for production:
   ```
   bun run build
   ```

## Project Structure

```
src/
  components/       React components (Header, StatementManager, PnLDashboard, ...)
  data/             Category config & sample data
  utils/            Accounting calculations, statement parsing, Excel export
  types.ts          Shared TypeScript types
server.ts           Express server + Gemini-powered statement/categorization endpoints
```

ข้อมูลทั้งหมดเก็บใน `localStorage` ของเบราว์เซอร์ ไม่มีการส่งข้อมูลธุรกรรมออกไปเก็บที่ server ยกเว้นตอนเรียก AI ช่วยอ่าน/จัดหมวดหมู่เท่านั้น
