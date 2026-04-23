export type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type ProductSize = {
  id: string;
  label: string;
  volume_ml: number;
  price_cents: number;
  active: boolean;
  sort_order: number;
};

export type Topping = {
  id: string;
  name: string;
  price_cents: number;
  active: boolean;
  sort_order: number;
  archived: boolean;
};

export type ProductToppingOption = {
  topping_id: string;
  name: string;
  price_cents: number;
  active: boolean;
  sort_order: number;
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
  sizes?: ProductSize[];
  included_toppings?: ProductToppingOption[];
  optional_toppings?: ProductToppingOption[];
};

export type CartToppingSelection = {
  toppingId: string;
  name: string;
  priceCents: number;
};

export type CartItem = {
  lineId: string;
  productId: string;
  name: string;
  imageUrl?: string | null;
  quantity: number;
  priceCents: number;
  selectedSize: {
    id: string;
    label: string;
    volumeMl: number;
    priceCents: number;
  };
  includedToppings: CartToppingSelection[];
  optionalToppings: CartToppingSelection[];
  toppings: string[];
};

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';

export type StoreSettings = {
  store_name: string;
  owner_whatsapp_number: string | null;
  allow_delivery: boolean;
  allow_pickup: boolean;
  default_order_message: string | null;
  public_site_url: string;
  freight_enabled?: boolean;
  free_shipping_enabled?: boolean;
  freight_per_km_cents?: number;
  freight_per_km_brl?: number;
  store_latitude?: number | null;
  store_longitude?: number | null;
  store_postal_code?: string | null;
  store_street?: string | null;
  store_neighborhood?: string | null;
  store_city?: string | null;
  store_state?: string | null;
  store_address_number?: string | null;
  delivery_origin_mode?: 'store_postal_code' | 'current_location';
  current_origin_latitude?: number | null;
  current_origin_longitude?: number | null;
  current_origin_updated_at?: string | null;
};
