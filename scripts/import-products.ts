// scripts/import-products.ts

import fs from "fs";
import path from "path";
import { parse } from "csv-parse";

type RawRow = {
  [key: string]: string | undefined;
};

/**
 * يجيب قيمة عمود من الصف حتى لو الاسم ملخبط:
 * - يتجاهل الـ BOM
 * - يشيل المسافات
 * - يحوّل الاسم لحروف صغيرة
 * مثال:
 *   getField(row, ["id"]) يلقط "id", "﻿id", "Id " ... الخ
 */
function getField(row: RawRow, candidates: string[]): string {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalizedKey = key
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\uFEFF/g, ""); // يشيل BOM لو موجود

    for (const cand of candidates) {
      const candNorm = cand.toLowerCase().replace(/\s+/g, "");
      if (normalizedKey === candNorm) {
        return (value ?? "").toString();
      }
    }
  }
  return "";
}

/**
 * تحويل نص السعر إلى رقم:
 * - يحوّل الفاصلة العشرية العربية أو الإنجليزية إلى نقطة (631,30 / 631،30 → 631.30)
 * - يشيل أي فضلات غير أرقام/فاصلة/نقطة
 * - يرجّع undefined لو مافي قيمة أو لو الرقم خربان
 */
function parsePrice(value?: string): number | undefined {
  if (!value) return undefined;

  let trimmed = value.trim();
  if (!trimmed) return undefined;

  // نحذف أي شيء غير أرقام أو فاصلة أو نقطة
  trimmed = trimmed.replace(/[^\d,،.]/g, "");

  // استبدال الفاصلة العشرية العربية أو الإنجليزية بنقطة
  trimmed = trimmed.replace(/[,،]/g, ".");

  const num = Number(trimmed);

  if (!Number.isFinite(num)) {
    return undefined;
  }

  return num;
}

async function main() {
  // مسار ملف CSV اللي تصدّره من الإكسل
  const csvPath = path.join(process.cwd(), "products.csv");
  // مكان حفظ JSON النهائي اللي يستخدمه المشروع
  const jsonPath = path.join(process.cwd(), "data", "products.json");

  // تأكد أن ملف CSV موجود
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ ملف CSV غير موجود: ${csvPath}`);
    console.error("تأكد إنك حاط products.csv في جذر المشروع.");
    process.exit(1);
  }

  console.log(`📥 نقرأ من: ${csvPath}`);

  const records: RawRow[] = [];

  const parser = fs.createReadStream(csvPath).pipe(
    parse({
      columns: true, // أول سطر = أسماء الأعمدة
      skip_empty_lines: true,
      trim: true,
      bom: true, // يشيل BOM من أول سطر
    })
  );

  for await (const record of parser) {
    records.push(record as RawRow);
  }

  console.log(`✅ تم قراءة ${records.length} صف من CSV`);

  let skippedNoPrice = 0;

  const normalized = records
    .map((row, index) => {
      // ===== id =====
      const rawId = getField(row, ["id"]);
      const id = rawId.trim();

      if (!id) {
        console.error("❌ صف بدون id بعد التطبيع (راح ينسكب):");
        console.error(`   index: ${index}`);
        console.error(`   keys: ${Object.keys(row).join(", ")}`);
        console.error(`   title: ${getField(row, ["title"])}`);
        // نتجاهل الصف بدل ما نوقف السكربت
        return null;
      }

      // ===== الحقول النصية =====
      const title = getField(row, ["title"]);

      const section_name =
        getField(row, ["section_name", "section_n"]) || undefined;

      const brand_raw = getField(row, ["brand_raw", "brand"]) || undefined;

      const image_url = getField(row, ["image_url"]);

      const availabilityRaw =
        getField(row, ["availability", "availabilit"]) || "in stock";

      const availability =
        availabilityRaw.trim() === "out of stock" ? "out of stock" : "in stock";

      // ===== الأسعار =====
      const priceNetRaw = getField(row, ["price_net"]);
      const parsedPriceNet = parsePrice(priceNetRaw);

      // 🔥 هنا الشرط اللي طلبته: لو السعر فاضي أو 0 نتجاهل الصف
      if (parsedPriceNet === undefined || parsedPriceNet === 0) {
        skippedNoPrice++;
        console.error("❌ صف بدون سعر صالح، راح نتجاهله:");
        console.error(`   index: ${index}`);
        console.error(`   id: ${id}`);
        console.error(`   title: ${title}`);
        console.error(`   price_net (raw): "${priceNetRaw}"`);
        return null;
      }

      const price_net = parsedPriceNet;

      const salePriceRaw = getField(row, ["sale_price_net", "sale_price"]);
      let sale_price_net = parsePrice(salePriceRaw);

      if (sale_price_net !== undefined && sale_price_net === 0) {
        sale_price_net = undefined;
      }

      const currency = (getField(row, ["currency"]) || "SAR").toUpperCase() as
        | "SAR"
        | (string & {});

      const item_group_id = getField(row, ["item_group_id"]) || undefined;

      return {
        id,
        title,
        section_name,
        brand_raw,
        image_url,
        availability,
        price_net,
        sale_price_net,
        currency: currency as "SAR",
        item_group_id,
        // description / product_url / updated_at نخليها للكود داخل Next
      };
    })
    .filter((row) => row !== null);

  // نتأكد أن مجلد data موجود
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(normalized, null, 2), "utf8");

  console.log(`💾 تم حفظ JSON في: ${jsonPath}`);
  console.log(
    `🎉 جاهز للاستخدام في /merchant.xml و /sitemaps — عدد المنتجات بعد التصفية: ${
      (normalized as any[]).length
    } (تم تجاهل ${skippedNoPrice} صف بدون سعر)`
  );
}

main().catch((err) => {
  console.error("❌ خطأ أثناء التحويل:", err);
  process.exit(1);
});
