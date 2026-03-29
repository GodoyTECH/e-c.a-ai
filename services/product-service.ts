import { getDb } from '@/lib/db';
import { Product, StoreSettings } from '@/lib/types';

export async function listStoreData() {
  const db = getDb();
  const categoriesRes = await db.query('SELECT id, name, slug, active FROM categories WHERE active = true ORDER BY name ASC');
  const productsRes = await db.query(
    `SELECT p.*, c.name as category_name
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.active = true
     ORDER BY p.featured DESC, p.created_at DESC`
  );
  const settingsRes = await db.query(
    'SELECT store_name, owner_whatsapp_number, allow_delivery, allow_pickup, default_order_message FROM store_settings WHERE id = 1'
  );

  return {
    categories: categoriesRes.rows,
    products: productsRes.rows as Product[],
    settings: settingsRes.rows[0] as StoreSettings
  };
}

export async function listAdminProducts() {
  const db = getDb();
  const res = await db.query(
    `SELECT p.*, c.name as category_name
     FROM products p
     JOIN categories c ON c.id = p.category_id
     ORDER BY p.created_at DESC`
  );
  return res.rows as Product[];
}

export async function upsertProduct(input: {
  id?: string;
  name: string;
  description: string;
  price_cents: number;
  category_id: string;
  active: boolean;
  featured: boolean;
  main_image_url?: string;
  images?: string[];
}) {
  const db = getDb();
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    let productId = input.id;
    if (productId) {
      await client.query(
        `UPDATE products SET
          name=$1, description=$2, price_cents=$3, category_id=$4, active=$5, featured=$6, main_image_url=$7, updated_at=NOW()
         WHERE id=$8`,
        [
          input.name,
          input.description,
          input.price_cents,
          input.category_id,
          input.active,
          input.featured,
          input.main_image_url || null,
          productId
        ]
      );
      await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
    } else {
      const inserted = await client.query(
        `INSERT INTO products (name, description, price_cents, category_id, active, featured, main_image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          input.name,
          input.description,
          input.price_cents,
          input.category_id,
          input.active,
          input.featured,
          input.main_image_url || null
        ]
      );
      productId = inserted.rows[0].id;
    }

    const images = (input.images || []).slice(0, 3);
    for (let i = 0; i < images.length; i++) {
      await client.query(
        'INSERT INTO product_images (product_id, image_url, position) VALUES ($1,$2,$3)',
        [productId, images[i], i]
      );
    }

    await client.query('COMMIT');
    return productId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteProduct(id: string) {
  const db = getDb();
  await db.query('DELETE FROM products WHERE id = $1', [id]);
}

export async function getStoreSettings() {
  const db = getDb();
  const res = await db.query(
    'SELECT store_name, owner_whatsapp_number, allow_delivery, allow_pickup, default_order_message FROM store_settings WHERE id=1'
  );
  return res.rows[0] as StoreSettings;
}

export async function updateStoreSettings(input: Partial<StoreSettings>) {
  const db = getDb();
  await db.query(
    `UPDATE store_settings SET
      store_name = COALESCE($1, store_name),
      owner_whatsapp_number = COALESCE($2, owner_whatsapp_number),
      allow_delivery = COALESCE($3, allow_delivery),
      allow_pickup = COALESCE($4, allow_pickup),
      default_order_message = COALESCE($5, default_order_message),
      updated_at = NOW()
     WHERE id = 1`,
    [
      input.store_name ?? null,
      input.owner_whatsapp_number ?? null,
      input.allow_delivery ?? null,
      input.allow_pickup ?? null,
      input.default_order_message ?? null
    ]
  );
}
