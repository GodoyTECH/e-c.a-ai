export function nextQuoteSequence(current: number) {
  return current + 1;
}

export function shouldApplyQuoteResponse(currentSequence: number, responseSequence: number) {
  return currentSequence === responseSequence;
}

export function canSubmitCheckout(params: {
  isLoadingOrder: boolean;
  orderType: 'delivery' | 'pickup';
  freightStatus: 'idle' | 'loading' | 'success' | 'error' | 'fallback';
  itemsCount: number;
}) {
  if (params.isLoadingOrder) return false;
  if (params.itemsCount <= 0) return false;
  if (params.orderType === 'delivery' && params.freightStatus === 'loading') return false;
  return true;
}
