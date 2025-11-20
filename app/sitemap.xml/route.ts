import { NextResponse } from "next/server";
import { PRODUCTS } from "@/lib/mock-products";

const STATIC_BASE_URL = "https://static.darb.com.sa";
const CHUNK_SIZE = 25000; // 25 ألف منتج لكل ملف

function getTotalPages(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK_SIZE));
}

export async function GET() {
  const totalProducts = PRODUCTS.length;
  const totalPages = getTotalPages(totalProducts);
  const now = new Date().toISOString();

  const sitemapsXml = Array.from({ length: totalPages }).map((_, i) => {
    const page = i + 1;
    // انتبه هنا غيّرنا الرابط:
    const loc = `${STATIC_BASE_URL}/sitemaps/products/${page}`;

    return `
      <sitemap>
        <loc>${loc}</loc>
        <lastmod>${now}</lastmod>
      </sitemap>
    `.trim();
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapsXml.join("\n")}
</sitemapindex>`.trim();

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
