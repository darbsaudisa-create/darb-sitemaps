export type Product = {
  id: string;
  title: string;
  description: string;
  product_url: string;
  image_url: string;
  availability: "in stock" | "out of stock";
  price_net: number;
  sale_price_net?: number;
  currency: "SAR";
  brand_raw?: string;
  brand?: string;
  section_name?: string;
  item_group_id?: string;
  updated_at?: string;
};
