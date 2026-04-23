import test from 'node:test';
import assert from 'node:assert/strict';
import { canSubmitCheckout, nextQuoteSequence, shouldApplyQuoteResponse } from '../lib/freight-quote-state.ts';

test('sequência de cotações ignora resposta fora de ordem', () => {
  const seq1 = nextQuoteSequence(0);
  const seq2 = nextQuoteSequence(seq1);

  assert.equal(shouldApplyQuoteResponse(seq2, seq1), false);
  assert.equal(shouldApplyQuoteResponse(seq2, seq2), true);
});

test('bloqueia finalizar pedido durante cálculo de frete para entrega', () => {
  const blocked = canSubmitCheckout({
    isLoadingOrder: false,
    orderType: 'delivery',
    freightStatus: 'loading',
    itemsCount: 2
  });

  assert.equal(blocked, false);
});

test('permite finalizar retirada mesmo com estado de frete em loading', () => {
  const allowed = canSubmitCheckout({
    isLoadingOrder: false,
    orderType: 'pickup',
    freightStatus: 'loading',
    itemsCount: 1
  });

  assert.equal(allowed, true);
});
