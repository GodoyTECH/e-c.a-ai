import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupCep } from '../lib/address-lookup.ts';

test('lookupCep usa retry em falha transitória', async () => {
  const originalFetch = global.fetch;
  let calls = 0;

  global.fetch = (async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error('timeout');
    }

    return {
      ok: true,
      json: async () => ({
        logradouro: 'Av Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP'
      })
    } as Response;
  }) as typeof fetch;

  try {
    const result = await lookupCep('01310-100');
    assert.equal(result?.street, 'Av Paulista');
    assert.equal(calls, 2);
  } finally {
    global.fetch = originalFetch;
  }
});
