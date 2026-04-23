import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateFreightFromInput } from '../lib/freight.ts';

const baseSettings = {
  store_name: 'Refrescando',
  owner_whatsapp_number: null,
  allow_delivery: true,
  allow_pickup: true,
  default_order_message: null,
  public_site_url: 'https://example.com',
  freight_enabled: true,
  free_shipping_enabled: false,
  freight_per_km_brl: 2,
  store_postal_code: '01001-000',
  delivery_origin_mode: 'store_postal_code' as const,
  current_origin_latitude: null,
  current_origin_longitude: null,
  current_origin_updated_at: null
};

test('retorna fallback seguro quando origem está indisponível', async () => {
  const result = await estimateFreightFromInput(
    {
      ...baseSettings,
      store_postal_code: '',
      delivery_origin_mode: 'store_postal_code'
    },
    { postalCode: '01310-100' }
  );

  assert.equal(result.mode, 'fallback');
  assert.equal(result.cents, 0);
});

test('calcula frete determinístico quando origem/destino têm coordenadas', async () => {
  const result = await estimateFreightFromInput(
    {
      ...baseSettings,
      delivery_origin_mode: 'current_location',
      current_origin_latitude: -23.5505,
      current_origin_longitude: -46.6333
    },
    { latitude: -23.5614, longitude: -46.6559 }
  );

  assert.equal(result.mode, 'calculated');
  assert.ok(result.cents > 0);
});

test('em frete grátis não depende de serviços externos', async () => {
  const result = await estimateFreightFromInput(
    {
      ...baseSettings,
      free_shipping_enabled: true
    },
    { postalCode: '99999999' }
  );

  assert.equal(result.mode, 'free');
  assert.equal(result.cents, 0);
});
