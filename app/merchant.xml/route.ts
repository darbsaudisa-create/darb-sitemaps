// app/merchant.xml/route.ts

import { NextResponse } from "next/server";
import { PRODUCTS } from "@/lib/mock-products";
import type { Product } from "@/lib/types";
import { BRAND_RULES, DEFAULT_BRAND } from "@/lib/brand-rules";

const STORE_BASE_URL = "https://darb.com.sa";

/**
 * حساب السعر مع الضريبة 15%
 */
function calcGross(priceNet: number): string {
  const gross = priceNet * 1.15;
  return gross.toFixed(2); // منزلتين عشريتين
}

/**
 * هروب الأحرف الخاصة عشان ما يخرب الـ XML
 * IMPORTANT: يتعامل مع undefined/null بدون ما يطيح
 */
function escapeXml(value: string | undefined | null): string {
  const safe = (value ?? "").toString();
  return safe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * تطبيع البراند حسب:
 * - قواعد BRAND_RULES (DENSO / AISIN / KYB / DEPO / 555 / NKN ...)
 * - منطق "أصلي + موديلات تويوتا" → TOYOTA
 * - تجاهل الكلمات اللي مو براند (تجاري / ياباني / تايواني / صيني...)
 * - لو بقى شيء محترم في brand_raw نرجعه، وإلا DEFAULT_BRAND
 */
function normalizeBrand(title: string, rawBrand?: string): string {
  const source = `${rawBrand || ""} ${title || ""}`.toLowerCase();

  // 1) نمشي على قواعد الماركات الصريحة من brand-rules.ts
  for (const rule of BRAND_RULES) {
    for (const pattern of rule.patterns) {
      const p = pattern.toLowerCase().trim();
      if (!p) continue;
      if (source.includes(p)) {
        return rule.value;
      }
    }
  }

  // 2) حالة "أصلي" + موديلات تويوتا → TOYOTA
  const isOriginal =
    source.includes("اصلي") ||
    source.includes("أصلي") ||
    source.includes("وكالة") ||
    source.includes("وكاله") ||
    source.includes("genuine");

  if (isOriginal) {
    const toyotaModels = [
      "يارس",
      "yaris",
      "كامري",
      "camry",
      "كورولا",
      "corolla",
      "افالون",
      "avalon",
      "هايلكس",
      "hilux",
      "لاندكروزر",
      "land cruiser",
      "برادو",
      "prado",
    ];

    if (toyotaModels.some((m) => source.includes(m))) {
      return "TOYOTA";
    }
  }

  // 3) كلمات مو براند (بلد/فئة) نطنّشها كبراند
  const nonBrandKeywords = [
    "تجاري",
    "تجارية",
    "تجاريه",
    "ياباني",
    "يابانية",
    "تايواني",
    "تايوانية",
    "صيني",
    "صينية",
    "كوري",
    "كورية",
  ];

  if (
    rawBrand &&
    nonBrandKeywords.some((kw) => (rawBrand ?? "").toLowerCase().includes(kw))
  ) {
    // نعاملها كأن مافيه brand_raw
    rawBrand = undefined;
  }

  // 4) لو rawBrand نص محترم بعد التصفية نرجعه كما هو
  if (rawBrand && rawBrand.trim().length >= 3) {
    return rawBrand.trim();
  }

  // 5) الديفولت
  return DEFAULT_BRAND;
}

/**
 * تحويل منتج واحد إلى عنصر <item> في Google Merchant feed
 */
function productToItemXml(p: Product): string {
  const priceGross = calcGross(p.price_net);
  const salePriceGross =
    typeof p.sale_price_net === "number" ? calcGross(p.sale_price_net) : null;

  const brand = normalizeBrand(p.title, p.brand ?? p.brand_raw);

  const link = p.product_url || STORE_BASE_URL;
  const image = p.image_url || "";

  return `
    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(p.description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${escapeXml(p.availability)}</g:availability>
      <g:price>${escapeXml(priceGross)} ${escapeXml(p.currency)}</g:price>
      ${
        salePriceGross
          ? `<g:sale_price>${escapeXml(salePriceGross)} ${escapeXml(
              p.currency
            )}</g:sale_price>`
          : ""
      }
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:condition>new</g:condition>
      ${
        p.item_group_id
          ? `<g:item_group_id>${escapeXml(p.item_group_id)}</g:item_group_id>`
          : ""
      }
    </item>
  `.trim();
}

export async function GET() {
  const itemsXml = PRODUCTS.map(productToItemXml).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Darb Product Feed</title>
    <link>${STORE_BASE_URL}</link>
    <description>Google Merchant feed for Darb store</description>
${itemsXml}
  </channel>
</rss>`.trim();

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
