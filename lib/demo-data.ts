import { Category, Product, StoreSettings, Topping } from '@/lib/types';

export const demoCategories: Category[] = [
  { id: 'cat-acai', name: 'Açaí', slug: 'acai', active: true },
  { id: 'cat-cremes', name: 'Cremes', slug: 'cremes', active: true },
  { id: 'cat-combos', name: 'Combos', slug: 'combos', active: true }
];

export const demoProducts: Product[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Açaí Tradicional 500ml',
    description: 'Açaí cremoso com banana e granola.',
    price_cents: 2490,
    category_id: 'cat-acai',
    active: true,
    featured: true,
    main_image_url:
      'https://images.unsplash.com/photo-1617111271828-3f5e8fba7d2f?auto=format&fit=crop&w=1200&q=80',
    category_name: 'Açaí'
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Açaí Protein 400ml',
    description: 'Açaí com whey de baunilha e pasta de amendoim.',
    price_cents: 2990,
    category_id: 'cat-acai',
    active: true,
    featured: true,
    main_image_url:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80',
    category_name: 'Açaí'
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Creme de Cupuaçu 500ml',
    description: 'Creme gelado de cupuaçu com leite condensado.',
    price_cents: 2690,
    category_id: 'cat-cremes',
    active: true,
    featured: false,
    main_image_url:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80',
    category_name: 'Cremes'
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Combo Casal',
    description: '2 açaís de 400ml + 2 adicionais premium.',
    price_cents: 4990,
    category_id: 'cat-combos',
    active: true,
    featured: true,
    main_image_url:
      'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80',
    category_name: 'Combos'
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

export const demoToppings: Topping[] = [
  { id: 'tp-1', name: 'Leite condensado', active: true },
  { id: 'tp-2', name: 'Leite em pó', active: true },
  { id: 'tp-3', name: 'Granola', active: true },
  { id: 'tp-4', name: 'Paçoca', active: true },
  { id: 'tp-5', name: 'Banana', active: true },
  { id: 'tp-6', name: 'Morango', active: true },
  { id: 'tp-7', name: 'Nutella', active: true },
  { id: 'tp-8', name: 'Mel', active: true },
  { id: 'tp-9', name: 'Ovomaltine', active: true },
  { id: 'tp-10', name: 'Coco ralado', active: true }
];
