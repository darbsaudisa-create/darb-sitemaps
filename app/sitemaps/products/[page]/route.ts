// app/sitemaps/products/[page]/route.ts

import { NextResponse } from "next/server";
import { PRODUCTS } from "@/lib/mock-products";
import type { Product } from "@/lib/types";

const STORE_BASE_URL = "https://darb.com.sa";
const CHUNK_SIZE = 25000;

function getTotalPages(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK_SIZE));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getLastmod(p: Product): string {
  if (p.updated_at) return p.updated_at;
  return new Date().toISOString();
}

function productToUrlXml(p: Product): string {
  const loc = p.product_url || STORE_BASE_URL;
  const lastmod = getLastmod(p);

  // 👇 نتأكد من رابط الصورة قبل ما نضيف بلوك image
  const rawImage = (p.image_url || "").trim();
  const hasValidImage =
    rawImage.startsWith("http://") || rawImage.startsWith("https://");

  const imageBlock = hasValidImage
    ? `
      <image:image>
        <image:loc>${escapeXml(rawImage)}</image:loc>
      </image:image>`
    : "";

  return `
    <url>
      <loc>${escapeXml(loc)}</loc>
      <lastmod>${lastmod}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>${imageBlock}
    </url>
  `.trim();
}

export async function GET(req: Request) {
  // ناخذ آخر جزء من الـ path كرقم الصفحة
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  // مثال: ["sitemaps", "products", "1"]
  const pageSegment = segments[segments.length - 1];
  const pageNumber = Number(pageSegment);

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    return new NextResponse(`Invalid sitemap page: "${pageSegment}"`, {
      status: 400,
    });
  }

  const totalProducts = PRODUCTS.length;
  const totalPages = getTotalPages(totalProducts);

  if (pageNumber > totalPages) {
    return new NextResponse("Sitemap page not found", { status: 404 });
  }

  const start = (pageNumber - 1) * CHUNK_SIZE;
  const end = start + CHUNK_SIZE;
  const slice = PRODUCTS.slice(start, end);

  const urlsXml = slice.map(productToUrlXml).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlsXml}
</urlset>`.trim();

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
