CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  category_id UUID NOT NULL REFERENCES categories(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  main_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  volume_ml INTEGER NOT NULL CHECK (volume_ml > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acai_toppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_included_toppings (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  topping_id UUID NOT NULL REFERENCES acai_toppings(id),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, topping_id)
);

CREATE TABLE IF NOT EXISTS product_optional_toppings (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  topping_id UUID NOT NULL REFERENCES acai_toppings(id),
  custom_price_cents INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, topping_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('delivery', 'pickup')),
  payment_method TEXT NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'credit_card', 'debit_card')),
  address TEXT,
  delivery_address TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','preparing','delivered','canceled','pending_whatsapp','rejected')),
  subtotal_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL DEFAULT 0,
  whatsapp_target_number TEXT,
  whatsapp_message_snapshot TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  name TEXT NOT NULL,
  product_name_snapshot TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  unit_price_snapshot INTEGER,
  line_total INTEGER,
  toppings_snapshot TEXT,
  details_snapshot JSONB
);

CREATE TABLE IF NOT EXISTS store_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  store_name TEXT NOT NULL DEFAULT 'Refrescando',
  owner_whatsapp_number TEXT,
  allow_delivery BOOLEAN NOT NULL DEFAULT TRUE,
  allow_pickup BOOLEAN NOT NULL DEFAULT TRUE,
  default_order_message TEXT,
  public_site_url TEXT NOT NULL DEFAULT 'https://refrescando.netlify.app/',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_row CHECK (id = 1)
);

INSERT INTO store_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_cents INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_target_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_message_snapshot TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS details_snapshot JSONB;
ALTER TABLE acai_toppings ADD COLUMN IF NOT EXISTS price_cents INTEGER;
ALTER TABLE acai_toppings ADD COLUMN IF NOT EXISTS sort_order SMALLINT;
ALTER TABLE acai_toppings ADD COLUMN IF NOT EXISTS archived BOOLEAN;

UPDATE orders SET payment_method = COALESCE(payment_method, 'pix');
UPDATE orders SET delivery_address = COALESCE(delivery_address, address);
UPDATE orders SET total_cents = COALESCE(total_cents, subtotal_cents, 0);

ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'pix';
ALTER TABLE orders ALTER COLUMN payment_method SET NOT NULL;
ALTER TABLE orders ALTER COLUMN total_cents SET DEFAULT 0;
ALTER TABLE orders ALTER COLUMN total_cents SET NOT NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('pix', 'credit_card', 'debit_card'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','confirmed','preparing','delivered','canceled','pending_whatsapp','rejected'));

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name_snapshot TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_snapshot INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_total INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS toppings_snapshot TEXT;

UPDATE order_items SET product_name_snapshot = COALESCE(product_name_snapshot, name);
UPDATE order_items SET unit_price_snapshot = COALESCE(unit_price_snapshot, unit_price_cents);
UPDATE order_items SET line_total = COALESCE(line_total, unit_price_cents * quantity);

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS public_site_url TEXT;
UPDATE store_settings SET public_site_url = COALESCE(NULLIF(public_site_url, ''), 'https://refrescando.netlify.app/');
UPDATE store_settings SET store_name = COALESCE(NULLIF(store_name, ''), 'Refrescando');
ALTER TABLE store_settings ALTER COLUMN public_site_url SET DEFAULT 'https://refrescando.netlify.app/';
ALTER TABLE store_settings ALTER COLUMN public_site_url SET NOT NULL;
ALTER TABLE store_settings ALTER COLUMN store_name SET DEFAULT 'Refrescando';

UPDATE acai_toppings SET price_cents = COALESCE(price_cents, 0), sort_order = COALESCE(sort_order, 0), archived = COALESCE(archived, false);
ALTER TABLE acai_toppings ALTER COLUMN price_cents SET DEFAULT 0;
ALTER TABLE acai_toppings ALTER COLUMN price_cents SET NOT NULL;
ALTER TABLE acai_toppings ALTER COLUMN sort_order SET DEFAULT 0;
ALTER TABLE acai_toppings ALTER COLUMN sort_order SET NOT NULL;
ALTER TABLE acai_toppings ALTER COLUMN archived SET DEFAULT false;
ALTER TABLE acai_toppings ALTER COLUMN archived SET NOT NULL;

INSERT INTO acai_toppings (name, active, price_cents, sort_order, archived) VALUES
  ('Leite condensado', true, 250, 1, false),
  ('Leite em pó', true, 200, 2, false),
  ('Granola', true, 180, 3, false),
  ('Paçoca', true, 200, 4, false),
  ('Banana', true, 220, 5, false),
  ('Morango', true, 300, 6, false),
  ('Nutella', true, 400, 7, false),
  ('Mel', true, 250, 8, false),
  ('Ovomaltine', true, 300, 9, false),
  ('Coco ralado', true, 220, 10, false)
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_optional_toppings_product_id ON product_optional_toppings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_included_toppings_product_id ON product_included_toppings(product_id);


ALTER TABLE orders ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS maps_link TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS freight_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_latitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_longitude DOUBLE PRECISION;

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS freight_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS free_shipping_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS freight_per_km_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS freight_per_km_brl NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_latitude DOUBLE PRECISION;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_longitude DOUBLE PRECISION;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_postal_code TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS delivery_origin_mode TEXT NOT NULL DEFAULT 'store_postal_code';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS current_origin_latitude DOUBLE PRECISION;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS current_origin_longitude DOUBLE PRECISION;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS current_origin_updated_at TIMESTAMPTZ;
UPDATE store_settings SET freight_per_km_brl = COALESCE(freight_per_km_brl, freight_per_km_cents / 100.0, 0);
