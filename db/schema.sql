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
  line_total INTEGER
);

CREATE TABLE IF NOT EXISTS store_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  store_name TEXT NOT NULL DEFAULT 'Açaí da Casa',
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

UPDATE order_items SET product_name_snapshot = COALESCE(product_name_snapshot, name);
UPDATE order_items SET unit_price_snapshot = COALESCE(unit_price_snapshot, unit_price_cents);
UPDATE order_items SET line_total = COALESCE(line_total, unit_price_cents * quantity);

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS public_site_url TEXT;
UPDATE store_settings SET public_site_url = COALESCE(NULLIF(public_site_url, ''), 'https://refrescando.netlify.app/');
ALTER TABLE store_settings ALTER COLUMN public_site_url SET DEFAULT 'https://refrescando.netlify.app/';
ALTER TABLE store_settings ALTER COLUMN public_site_url SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
