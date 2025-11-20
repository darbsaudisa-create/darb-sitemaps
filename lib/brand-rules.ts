// lib/brand-rules.ts

export type BrandRule = {
  value: string; // الاسم الرسمي الذي سيرسَل في <g:brand>
  patterns: string[]; // الكلمات اللي لو ظهرت في العنوان/البراند نعتبرها هذا البراند
};

// قواعد تحديد البراند بناءً على النص في brand_raw أو العنوان
export const BRAND_RULES: BrandRule[] = [
  // ==== DENSO / دنسو ====
  {
    value: "DENSO",
    patterns: ["denso", "دنسو", "دنزو", "دنسو ياباني", "دنسو تايلندي"],
  },

  // ==== AISIN / ايسن ====
  {
    value: "AISIN",
    patterns: ["aisin", "ايسن", "أيسن", "ايسين"],
  },

  // ==== KYB مساعدات ====
  {
    value: "KYB",
    patterns: ["kyb", "كي واي بي", "كيyb"],
  },

  // ==== DEPO / ديبو ====
  {
    value: "DEPO",
    patterns: ["depo", "ديبو"],
  },

  // ==== 555 / ثلاث خمسات 555 ====
  {
    value: "555",
    patterns: ["555", "ثلاث خمسات", "ثلاث خمسات 555"],
  },

  // ==== NKN / nkn ====
  {
    value: "NKN",
    patterns: ["nkn", "NKN"],
  },

  // ملاحظة:
  // "تجاري" / "ياباني" / "تايواني" / "اصلي" لو جاءت وحدها
  // لا نعتبرها براند، نتركها تروح لـ DEFAULT_BRAND
];

// قيمة البراند الافتراضي لما ما نلقى أي تطابق فعلي
export const DEFAULT_BRAND = "عام";
