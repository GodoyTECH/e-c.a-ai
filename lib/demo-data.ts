import { Category, Product, StoreSettings, Topping } from '@/lib/types';

export const demoCategories: Category[] = [
  { id: 'cat-acai', name: 'Açaí', slug: 'acai', active: true },
  { id: 'cat-cremes', name: 'Cremes', slug: 'cremes', active: true },
  { id: 'cat-combos', name: 'Combos', slug: 'combos', active: true }
];

export const demoToppings: Topping[] = [
  { id: 'tp-1', name: 'Leite condensado', price_cents: 250, active: true, sort_order: 1, archived: false },
  { id: 'tp-2', name: 'Leite em pó', price_cents: 200, active: true, sort_order: 2, archived: false },
  { id: 'tp-3', name: 'Granola', price_cents: 180, active: true, sort_order: 3, archived: false },
  { id: 'tp-4', name: 'Paçoca', price_cents: 200, active: true, sort_order: 4, archived: false },
  { id: 'tp-5', name: 'Banana', price_cents: 220, active: true, sort_order: 5, archived: false },
  { id: 'tp-6', name: 'Morango', price_cents: 300, active: true, sort_order: 6, archived: false },
  { id: 'tp-7', name: 'Nutella', price_cents: 400, active: true, sort_order: 7, archived: false },
  { id: 'tp-8', name: 'Mel', price_cents: 250, active: true, sort_order: 8, archived: false },
  { id: 'tp-9', name: 'Ovomaltine', price_cents: 300, active: true, sort_order: 9, archived: false },
  { id: 'tp-10', name: 'Coco ralado', price_cents: 220, active: true, sort_order: 10, archived: false }
];

export const demoProducts: Product[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Açaí Tradicional',
    description: 'Açaí cremoso com combinação clássica.',
    price_cents: 2490,
    category_id: 'cat-acai',
    active: true,
    featured: true,
    main_image_url:
      'https://images.unsplash.com/photo-1617111271828-3f5e8fba7d2f?auto=format&fit=crop&w=1200&q=80',
    category_name: 'Açaí',
    sizes: [
      { id: 'sz-1', label: 'Pequeno', volume_ml: 300, price_cents: 1990, active: true, sort_order: 1 },
      { id: 'sz-2', label: 'Médio', volume_ml: 500, price_cents: 2490, active: true, sort_order: 2 },
      { id: 'sz-3', label: 'Grande', volume_ml: 700, price_cents: 3290, active: true, sort_order: 3 }
    ],
    included_toppings: [
      { topping_id: 'tp-3', name: 'Granola', price_cents: 0, active: true, sort_order: 1 },
      { topping_id: 'tp-5', name: 'Banana', price_cents: 0, active: true, sort_order: 2 }
    ],
    optional_toppings: demoToppings.map((item) => ({
      topping_id: item.id,
      name: item.name,
      price_cents: item.price_cents,
      active: item.active,
      sort_order: item.sort_order
    }))
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Açaí Especial',
    description: 'Blend premium com combinações especiais.',
    price_cents: 2990,
    category_id: 'cat-acai',
    active: true,
    featured: true,
    main_image_url:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80',
    category_name: 'Açaí',
    sizes: [
      { id: 'sz-4', label: 'Médio', volume_ml: 500, price_cents: 2990, active: true, sort_order: 1 },
      { id: 'sz-5', label: 'Grande', volume_ml: 700, price_cents: 3690, active: true, sort_order: 2 }
    ],
    included_toppings: [
      { topping_id: 'tp-2', name: 'Leite em pó', price_cents: 0, active: true, sort_order: 1 },
      { topping_id: 'tp-4', name: 'Paçoca', price_cents: 0, active: true, sort_order: 2 }
    ],
    optional_toppings: demoToppings.map((item) => ({
      topping_id: item.id,
      name: item.name,
      price_cents: item.price_cents,
      active: item.active,
      sort_order: item.sort_order
    }))
  }
];

export const demoSettings: StoreSettings = {
  store_name: 'Refrescando (Demo)',
  owner_whatsapp_number: '5511999999999',
  allow_delivery: true,
  allow_pickup: true,
  default_order_message: 'Olá! Quero confirmar meu pedido demo.',
  public_site_url: 'https://refrescando.netlify.app/'
};
