// lib/mock-products.ts
import type { Product } from "./types";
import rawProductsJson from "@/data/products.json";

// شكل البيانات الخام الجاية من JSON (نفس اللي يطلع من products.csv)
type RawProduct = {
  id: string;
  title: string;
  section_name?: string;
  brand_raw?: string;
  image_url: string;
  availability: string; // "in stock" أو "out of stock"
  price_net: number; // من السكربت تحوّل من نص → رقم
  sale_price_net?: number; // اختياري
  currency?: string; // غالباً SAR
  item_group_id?: string; // اختياري
  updated_at?: string; // لو جاي من مصدر ثاني، وإلا نخليه فاضي

  // نخليهم اختياريين عشان لو يوم حبيت تضيفهم من الإكسل
  description?: string;
  product_url?: string;
};

// نحول JSON إلى نوع RawProduct[]
const rawProducts = rawProductsJson as RawProduct[];

/**
 * توليف الوصف لو فاضي
 */
function buildDescription(title: string, sectionName?: string): string {
  const sectionPart = sectionName
    ? `من قسم ${sectionName}`
    : "من أقسام درب المتنوعة";

  return `${title} — اطلبها من درب لقطع غيار السيارات (DARB) ${sectionPart}. شحن سريع لجميع مدن المملكة، ومتوفّر خيار التقسيط عبر تمارا وتابي.`;
}

/**
 * تحويل العنوان إلى slug للرابط
 */
function slugifyTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, "-") // المسافات → -
    .replace(/[/\\?&#%]/g, "") // حذف رموز تخرب الرابط
    .toLowerCase();
}

/**
 * بناء رابط المنتج لو فاضي: https://darb.com.sa/[slug]/p[id]
 */
function buildProductUrl(title: string, id: string): string {
  const slug = slugifyTitle(title);
  return `https://darb.com.sa/${slug}/p${id}`;
}

export const PRODUCTS: Product[] = rawProducts.map((p) => {
  const currency = (p.currency || "SAR") as Product["currency"];

  const description =
    p.description && p.description.trim().length > 0
      ? p.description
      : buildDescription(p.title, p.section_name);

  const product_url =
    p.product_url && p.product_url.trim().length > 0
      ? p.product_url
      : buildProductUrl(p.title, p.id);

  return {
    id: p.id,
    title: p.title,
    description,
    product_url,
    image_url: p.image_url,
    availability:
      p.availability === "out of stock" ? "out of stock" : "in stock",
    price_net: p.price_net,
    sale_price_net: p.sale_price_net,
    currency,
    brand_raw: p.brand_raw,
    // brand نخليها undefined ونخلي normalizeBrand يتكفّل فيها في merchant.xml
    brand: undefined,
    section_name: p.section_name,
    item_group_id: p.item_group_id,
    updated_at: p.updated_at,
  };
});
