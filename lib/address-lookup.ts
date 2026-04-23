type CepLookupResult = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

type CacheEntry<T> = { value: T; expiresAt: number };

function sanitizePostalCode(value?: string | null) {
  return (value || '').replace(/\D/g, '').slice(0, 8);
}

const CEP_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const cepCache = new Map<string, CacheEntry<CepLookupResult | null>>();

function logMetric(event: string, details: Record<string, unknown>) {
  console.info('[cep-metric]', event, details);
}

function getCached(cep: string) {
  const item = cepCache.get(cep);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    cepCache.delete(cep);
    return null;
  }
  return item.value;
}

function setCached(cep: string, value: CepLookupResult | null) {
  cepCache.set(cep, { value, expiresAt: Date.now() + CEP_CACHE_TTL_MS });
}

async function withTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupCep(cepInput: string): Promise<CepLookupResult | null> {
  const cep = sanitizePostalCode(cepInput);
  if (cep.length !== 8) return null;

  const cached = getCached(cep);
  if (cached !== null) return cached;

  const startedAt = Date.now();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const data = await withTimeout(`https://viacep.com.br/ws/${cep}/json/`, 8000);

      if (data?.erro) {
        setCached(cep, null);
        return null;
      }

      if (!data?.logradouro || !data?.bairro || !data?.localidade || !data?.uf) {
        setCached(cep, null);
        return null;
      }

      const result = {
        cep,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf
      };

      setCached(cep, result);
      logMetric('viacep_success', { cep, latencyMs: Date.now() - startedAt, attempt });
      return result;
    } catch (error) {
      lastError = error;
      logMetric('viacep_failure', {
        cep,
        latencyMs: Date.now() - startedAt,
        attempt,
        message: error instanceof Error ? error.message : 'unknown'
      });
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha ao consultar CEP');
}
