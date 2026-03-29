const { Client } = require('pg');

const categories = [
  { name: 'Tradicionais', slug: 'tradicionais' },
  { name: 'Premium', slug: 'premium' },
  { name: 'Combos', slug: 'combos' }
];

const products = [
  {
    name: 'Açaí 300ml',
    description: 'Açaí cremoso com granola e banana.',
    price_cents: 1990,
    category_slug: 'tradicionais',
    featured: true,
    main_image_url: 'https://images.unsplash.com/photo-1590086782792-42dd2350140d'
  },
  {
    name: 'Açaí 500ml Premium',
    description: 'Açaí com paçoca, leite em pó e morango.',
    price_cents: 2990,
    category_slug: 'premium',
    featured: true,
    main_image_url: 'https://images.unsplash.com/photo-1542444592-0d6685ce4fd4'
  }
];

async function run() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente.');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  for (const category of categories) {
    await client.query(
      'INSERT INTO categories (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING',
      [category.name, category.slug]
    );
  }

  for (const product of products) {
    const { rows } = await client.query('SELECT id FROM categories WHERE slug = $1', [product.category_slug]);
    if (!rows[0]) continue;

    await client.query(
      `INSERT INTO products (name, description, price_cents, category_id, featured, main_image_url)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [product.name, product.description, product.price_cents, rows[0].id, product.featured, product.main_image_url]
    );
  }

  await client.end();
  console.log('Seed finalizado.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
