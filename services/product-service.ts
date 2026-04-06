import { ensureDbSchema, getDb } from '@/lib/db';
import { Product, ProductSize, ProductToppingOption, StoreSettings, Topping } from '@/lib/types';
import { demoCategories, demoProducts, demoSettings, demoToppings } from '@/lib/demo-data';

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://refrescando.netlify.app/';

type ProductRow = Product & {
  sizes?: ProductSize[];
  included_toppings?: ProductToppingOption[];
  optional_toppings?: ProductToppingOption[];
};

function appendGlobalOptionalToppings(
  products: ProductRow[],
  catalogToppings: Array<{ id: string; name: string; price_cents: number; active: boolean; sort_order: number; archived: boolean }>
) {
  const activeCatalog = catalogToppings.filter((topping) => topping.active && !topping.archived);
  if (!activeCatalog.length) return products;

  return products.map((product) => {
    const currentOptionals = product.optional_toppings || [];
    const existingIds = new Set(currentOptionals.map((item) => item.topping_id));
    const highestSortOrder = currentOptionals.reduce((max, item) => Math.max(max, item.sort_order || 0), 0);

    const inheritedOptionals: ProductToppingOption[] = activeCatalog
      .filter((topping) => !existingIds.has(topping.id))
      .map((topping, index) => ({
        topping_id: topping.id,
        name: topping.name,
        price_cents: topping.price_cents || 0,
        active: true,
        sort_order: highestSortOrder + index + 1
      }));

    return {
      ...product,
      optional_toppings: [...currentOptionals, ...inheritedOptionals]
    };
  });
}

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

async function hydrateProducts(rows: ProductRow[]) {
  if (!rows.length) return rows;

  const db = getDb();
  const productIds = rows.map((product) => product.id);

  const [sizesRes, includedRes, optionalRes] = await Promise.all([
    db.query(
      `SELECT id, product_id, label, volume_ml, price_cents, active, sort_order
       FROM product_sizes
       WHERE product_id = ANY($1::uuid[])
       ORDER BY sort_order ASC, volume_ml ASC`,
      [productIds]
    ),
    db.query(
      `SELECT pit.product_id, pit.topping_id, t.name, pit.sort_order, t.active, 0 AS price_cents
       FROM product_included_toppings pit
       JOIN acai_toppings t ON t.id = pit.topping_id
       WHERE pit.product_id = ANY($1::uuid[])
       ORDER BY pit.sort_order ASC, t.name ASC`,
      [productIds]
    ),
    db.query(
      `SELECT pot.product_id, pot.topping_id, t.name, pot.sort_order, pot.active, COALESCE(pot.custom_price_cents, t.price_cents, 0) AS price_cents
       FROM product_optional_toppings pot
       JOIN acai_toppings t ON t.id = pot.topping_id
       WHERE pot.product_id = ANY($1::uuid[])
       ORDER BY pot.sort_order ASC, t.name ASC`,
      [productIds]
    )
  ]);

  const sizesMap = new Map<string, ProductSize[]>();
  for (const row of sizesRes.rows) {
    const arr = sizesMap.get(row.product_id) || [];
    arr.push({
      id: row.id,
      label: row.label,
      volume_ml: row.volume_ml,
      price_cents: row.price_cents,
      active: row.active,
      sort_order: row.sort_order
    });
    sizesMap.set(row.product_id, arr);
  }

  const includedMap = new Map<string, ProductToppingOption[]>();
  for (const row of includedRes.rows) {
    const arr = includedMap.get(row.product_id) || [];
    arr.push({
      topping_id: row.topping_id,
      name: row.name,
      price_cents: 0,
      active: row.active,
      sort_order: row.sort_order
    });
    includedMap.set(row.product_id, arr);
  }

  const optionalMap = new Map<string, ProductToppingOption[]>();
  for (const row of optionalRes.rows) {
    const arr = optionalMap.get(row.product_id) || [];
    arr.push({
      topping_id: row.topping_id,
      name: row.name,
      price_cents: row.price_cents,
      active: row.active,
      sort_order: row.sort_order
    });
    optionalMap.set(row.product_id, arr);
  }

  return rows.map((product) => {
    const sizes = sizesMap.get(product.id) || [];
    return {
      ...product,
      sizes: sizes.length
        ? sizes
        : [
            {
              id: `base-${product.id}`,
              label: 'Padrão',
              volume_ml: 500,
              price_cents: product.price_cents,
              active: true,
              sort_order: 0
            }
          ],
      included_toppings: includedMap.get(product.id) || [],
      optional_toppings: optionalMap.get(product.id) || []
    };
  });
}

export async function listStoreData() {
  if (!process.env.DATABASE_URL) {
    return { categories: demoCategories, products: demoProducts, settings: demoSettings, toppings: demoToppings };
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
      'SELECT store_name, owner_whatsapp_number, allow_delivery, allow_pickup, default_order_message, public_site_url, freight_enabled, free_shipping_enabled, freight_per_km_cents, freight_per_km_brl, store_latitude, store_longitude, store_postal_code, delivery_origin_mode, current_origin_latitude, current_origin_longitude, current_origin_updated_at FROM store_settings WHERE id = 1'
    );
    const toppingsRes = await db.query(
      'SELECT id, name, price_cents, active, sort_order, archived FROM acai_toppings WHERE archived = false ORDER BY sort_order ASC, name ASC'
    );

    const products = await hydrateProducts(productsRes.rows as ProductRow[]);
    const toppingsRows = toppingsRes.rows as Topping[];
    const productsWithGlobalOptionals = appendGlobalOptionalToppings(products, toppingsRows);

    return {
      categories: categoriesRows,
      products: productsWithGlobalOptionals.length ? productsWithGlobalOptionals : demoProducts,
      settings: settingsRes.rows[0] as StoreSettings,
      toppings: toppingsRows.length ? toppingsRows : demoToppings
    };
  } catch (error) {
    console.warn('Falha ao consultar banco de dados. Entrando em modo demonstração.', error);
    return { categories: demoCategories, products: demoProducts, settings: demoSettings, toppings: demoToppings };
  }
}

export async function listAdminProducts() {
  if (!process.env.DATABASE_URL) return demoProducts;

  try {
    await ensureDbSchema();
    const db = getDb();
    const [productsRes, toppingsRes] = await Promise.all([
      db.query(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ORDER BY p.created_at DESC`
      ),
      db.query(
        'SELECT id, name, price_cents, active, sort_order, archived FROM acai_toppings WHERE archived = false ORDER BY sort_order ASC, name ASC'
      )
    ]);

    const products = await hydrateProducts(productsRes.rows as ProductRow[]);
    const productsWithGlobalOptionals = appendGlobalOptionalToppings(products, toppingsRes.rows as Topping[]);
    return productsWithGlobalOptionals.length ? productsWithGlobalOptionals : demoProducts;
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
  sizes?: Array<{ id?: string; label: string; volume_ml: number; price_cents: number; active: boolean; sort_order: number }>;
  included_topping_ids?: string[];
  optional_toppings?: Array<{ topping_id: string; price_cents: number; active: boolean; sort_order: number }>;
  catalog_toppings?: Array<{ id?: string; name: string; price_cents: number; active: boolean; sort_order: number; archived: boolean }>;
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

    if (Array.isArray(input.catalog_toppings)) {
      for (const topping of input.catalog_toppings) {
        if (topping.id) {
          await client.query(
            'UPDATE acai_toppings SET name=$1, price_cents=$2, active=$3, sort_order=$4, archived=$5 WHERE id=$6',
            [topping.name, topping.price_cents, topping.active, topping.sort_order, topping.archived, topping.id]
          );
        } else {
          await client.query(
            'INSERT INTO acai_toppings (name, price_cents, active, sort_order, archived) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (name) DO UPDATE SET price_cents=EXCLUDED.price_cents, active=EXCLUDED.active, sort_order=EXCLUDED.sort_order, archived=EXCLUDED.archived',
            [topping.name, topping.price_cents, topping.active, topping.sort_order, topping.archived]
          );
        }
      }
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
      await client.query('DELETE FROM product_sizes WHERE product_id = $1', [productId]);
      await client.query('DELETE FROM product_included_toppings WHERE product_id = $1', [productId]);
      await client.query('DELETE FROM product_optional_toppings WHERE product_id = $1', [productId]);
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
      await client.query('INSERT INTO product_images (product_id, image_url, position) VALUES ($1,$2,$3)', [productId, images[i], i]);
    }

    const validSizes = (input.sizes || []).filter((size) => size.label.trim() && size.volume_ml > 0);
    for (const size of validSizes) {
      await client.query(
        `INSERT INTO product_sizes (product_id, label, volume_ml, price_cents, active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [productId, size.label.trim(), size.volume_ml, size.price_cents, size.active, size.sort_order]
      );
    }

    for (const toppingId of input.included_topping_ids || []) {
      await client.query(
        'INSERT INTO product_included_toppings (product_id, topping_id, sort_order) VALUES ($1,$2,$3) ON CONFLICT (product_id, topping_id) DO NOTHING',
        [productId, toppingId, 0]
      );
    }

    for (const topping of input.optional_toppings || []) {
      await client.query(
        `INSERT INTO product_optional_toppings (product_id, topping_id, custom_price_cents, active, sort_order)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (product_id, topping_id) DO UPDATE SET custom_price_cents=EXCLUDED.custom_price_cents, active=EXCLUDED.active, sort_order=EXCLUDED.sort_order`,
        [productId, topping.topping_id, topping.price_cents, topping.active, topping.sort_order]
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
      'SELECT store_name, owner_whatsapp_number, allow_delivery, allow_pickup, default_order_message, public_site_url, freight_enabled, free_shipping_enabled, freight_per_km_cents, freight_per_km_brl, store_latitude, store_longitude, store_postal_code, delivery_origin_mode, current_origin_latitude, current_origin_longitude, current_origin_updated_at FROM store_settings WHERE id=1'
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
      freight_enabled,
      free_shipping_enabled,
      freight_per_km_cents,
      freight_per_km_brl,
      store_latitude,
      store_longitude,
      store_postal_code,
      delivery_origin_mode,
      current_origin_latitude,
      current_origin_longitude,
      current_origin_updated_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
    ON CONFLICT (id) DO UPDATE SET
      store_name = EXCLUDED.store_name,
      owner_whatsapp_number = EXCLUDED.owner_whatsapp_number,
      allow_delivery = EXCLUDED.allow_delivery,
      allow_pickup = EXCLUDED.allow_pickup,
      default_order_message = EXCLUDED.default_order_message,
      public_site_url = EXCLUDED.public_site_url,
      freight_enabled = EXCLUDED.freight_enabled,
      free_shipping_enabled = EXCLUDED.free_shipping_enabled,
      freight_per_km_cents = EXCLUDED.freight_per_km_cents,
      freight_per_km_brl = EXCLUDED.freight_per_km_brl,
      store_latitude = EXCLUDED.store_latitude,
      store_longitude = EXCLUDED.store_longitude,
      store_postal_code = EXCLUDED.store_postal_code,
      delivery_origin_mode = EXCLUDED.delivery_origin_mode,
      current_origin_latitude = EXCLUDED.current_origin_latitude,
      current_origin_longitude = EXCLUDED.current_origin_longitude,
      current_origin_updated_at = EXCLUDED.current_origin_updated_at,
      updated_at = NOW()`,
    [
      1,
      (input.store_name || 'Refrescando').trim(),
      (input.owner_whatsapp_number || '').replace(/\D/g, ''),
      input.allow_delivery ?? true,
      input.allow_pickup ?? true,
      input.default_order_message ?? null,
      (input.public_site_url || DEFAULT_SITE_URL).trim(),
      input.freight_enabled ?? false,
      input.free_shipping_enabled ?? true,
      Math.max(0, Number(input.freight_per_km_cents ?? Math.round(Number(input.freight_per_km_brl ?? 0) * 100))),
      Math.max(0, Number(input.freight_per_km_brl ?? 0)),
      Number.isFinite(Number(input.store_latitude)) ? Number(input.store_latitude) : null,
      Number.isFinite(Number(input.store_longitude)) ? Number(input.store_longitude) : null,
      (input.store_postal_code || '').replace(/\D/g, '') || null,
      input.delivery_origin_mode === 'current_location' ? 'current_location' : 'store_postal_code',
      Number.isFinite(Number(input.current_origin_latitude)) ? Number(input.current_origin_latitude) : null,
      Number.isFinite(Number(input.current_origin_longitude)) ? Number(input.current_origin_longitude) : null,
      input.current_origin_updated_at ?? null
    ]
  );
}

export async function listToppings(includeInactive = false) {
  if (!process.env.DATABASE_URL) {
    return includeInactive ? demoToppings : demoToppings.filter((item) => item.active);
  }

  await ensureDbSchema();
  const db = getDb();
  const query = includeInactive
    ? 'SELECT id, name, price_cents, active, sort_order, archived FROM acai_toppings ORDER BY sort_order ASC, name ASC'
    : 'SELECT id, name, price_cents, active, sort_order, archived FROM acai_toppings WHERE active = true AND archived = false ORDER BY sort_order ASC, name ASC';
  const res = await db.query(query);
  return res.rows as Topping[];
}

export async function seedDefaultToppings() {
  if (!process.env.DATABASE_URL) return;

  await ensureDbSchema();
  const db = getDb();
  for (const topping of demoToppings) {
    await db.query(
      'INSERT INTO acai_toppings (name, price_cents, active, sort_order, archived) VALUES ($1,$2,true,$3,false) ON CONFLICT (name) DO UPDATE SET price_cents=EXCLUDED.price_cents, archived=false',
      [topping.name, topping.price_cents, topping.sort_order]
    );
  }
}

export async function updateToppingStatus(id: string, active: boolean) {
  await ensureDbSchema();
  const db = getDb();
  await db.query('UPDATE acai_toppings SET active = $1 WHERE id = $2', [active, id]);
}

export async function upsertTopping(input: {
  id?: string;
  name: string;
  price_cents: number;
  active: boolean;
  sort_order: number;
  archived?: boolean;
}) {
  await ensureDbSchema();
  const db = getDb();

  if (input.id) {
    await db.query(
      `UPDATE acai_toppings
       SET name = $1,
           price_cents = $2,
           active = $3,
           sort_order = $4,
           archived = $5
       WHERE id = $6`,
      [input.name.trim(), input.price_cents, input.active, input.sort_order, input.archived ?? false, input.id]
    );
    return input.id;
  }

  const inserted = await db.query(
    `INSERT INTO acai_toppings (name, price_cents, active, sort_order, archived)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (name) DO UPDATE SET
       price_cents = EXCLUDED.price_cents,
       active = EXCLUDED.active,
       sort_order = EXCLUDED.sort_order,
       archived = EXCLUDED.archived
     RETURNING id`,
    [input.name.trim(), input.price_cents, input.active, input.sort_order, input.archived ?? false]
  );

  return inserted.rows[0].id as string;
}
