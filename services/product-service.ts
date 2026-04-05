import { ensureDbSchema, getDb } from '@/lib/db';
import { Product, StoreSettings } from '@/lib/types';
import { demoCategories, demoProducts, demoSettings } from '@/lib/demo-data';

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://refrescando.netlify.app/';

async function ensureDefaultCategories() {
  const db = getDb();
  const existing = await db.query('SELECT id, name, slug, active FROM categories WHERE active = true ORDER BY name ASC');
  if (existing.rows.length) return existing.rows;

  const defaults = [
    { name: 'Açaí', slug: 'acai' },
    { name: 'Cremes', slug: 'cremes' },
    { name: 'Combos', slug: 'combos' }
  ];

  for (const category of defaults) {
    await db.query('INSERT INTO categories (name, slug, active) VALUES ($1,$2,true) ON CONFLICT (slug) DO NOTHING', [
      category.name,
      category.slug
    ]);
  }

  const created = await db.query('SELECT id, name, slug, active FROM categories WHERE active = true ORDER BY name ASC');
  return created.rows;
}


export async function listStoreData() {
  if (!process.env.DATABASE_URL) {
    return { categories: demoCategories, products: demoProducts, settings: demoSettings };
  }

  try {
    await ensureDbSchema();
    const db = getDb();
    const categoriesRows = await ensureDefaultCategories();
    const productsRes = await db.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.active = true
       ORDER BY p.featured DESC, p.created_at DESC`
    );
    const settingsRes = await db.query(
      'SELECT store_name, owner_whatsapp_number, allow_delivery, allow_pickup, default_order_message, public_site_url FROM store_settings WHERE id = 1'
    );

    const products = productsRes.rows as Product[];

    return {
      categories: categoriesRows,
      products: products.length ? products : demoProducts,
      settings: settingsRes.rows[0] as StoreSettings
    };
  } catch (error) {
    console.warn('Falha ao consultar banco de dados. Entrando em modo demonstração.', error);
    return { categories: demoCategories, products: demoProducts, settings: demoSettings };
  }
}

export async function listAdminProducts() {
  if (!process.env.DATABASE_URL) return demoProducts;

  try {
    await ensureDbSchema();
    const db = getDb();
    const res = await db.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ORDER BY p.created_at DESC`
    );
    const products = res.rows as Product[];
    return products.length ? products : demoProducts;
  } catch (error) {
    console.warn('Falha ao listar produtos do admin. Retornando dados demo.', error);
    return demoProducts;
  }
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
  await ensureDbSchema();
  const db = getDb();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const categoryCheck = await client.query('SELECT id FROM categories WHERE id = $1', [input.category_id]);
    if (!categoryCheck.rows[0]) {
      const fallbackCategory = await client.query('SELECT id FROM categories ORDER BY created_at ASC LIMIT 1');
      if (!fallbackCategory.rows[0]) {
        throw new Error('Nenhuma categoria disponível para vincular o produto.');
      }
      input.category_id = fallbackCategory.rows[0].id;
    }

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
  await ensureDbSchema();
  const db = getDb();
  await db.query('DELETE FROM products WHERE id = $1', [id]);
}

export async function getStoreSettings() {
  if (!process.env.DATABASE_URL) return demoSettings;

  try {
    await ensureDbSchema();
    const db = getDb();
    const res = await db.query(
      'SELECT store_name, owner_whatsapp_number, allow_delivery, allow_pickup, default_order_message, public_site_url FROM store_settings WHERE id=1'
    );
    return res.rows[0] as StoreSettings;
  } catch (error) {
    console.warn('Falha ao carregar configurações da loja. Retornando configurações demo.', error);
    return demoSettings;
  }
}

export async function updateStoreSettings(input: Partial<StoreSettings>) {
  await ensureDbSchema();
  const db = getDb();

  await db.query(
    `INSERT INTO store_settings (
      id,
      store_name,
      owner_whatsapp_number,
      allow_delivery,
      allow_pickup,
      default_order_message,
      public_site_url,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
    ON CONFLICT (id) DO UPDATE SET
      store_name = EXCLUDED.store_name,
      owner_whatsapp_number = EXCLUDED.owner_whatsapp_number,
      allow_delivery = EXCLUDED.allow_delivery,
      allow_pickup = EXCLUDED.allow_pickup,
      default_order_message = EXCLUDED.default_order_message,
      public_site_url = EXCLUDED.public_site_url,
      updated_at = NOW()`,
    [
      1,
      (input.store_name || 'Açaí da Casa').trim(),
      (input.owner_whatsapp_number || '').replace(/\D/g, ''),
      input.allow_delivery ?? true,
      input.allow_pickup ?? true,
      input.default_order_message ?? null,
(input.public_site_url || DEFAULT_SITE_URL).trim()
    ]
  );
}
