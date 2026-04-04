export type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category_id: string;
  active: boolean;
  featured: boolean;
  main_image_url: string | null;
  category_name?: string;
  images?: string[];
};

export type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  quantity: number;
};

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';

export type StoreSettings = {
  store_name: string;
  owner_whatsapp_number: string | null;
  allow_delivery: boolean;
  allow_pickup: boolean;
  default_order_message: string | null;
  public_site_url: string;
};
