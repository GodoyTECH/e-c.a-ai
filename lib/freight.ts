export type FreightDestination = {
  postalCode?: string | null;
  fullAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type FreightQuoteResult = {
  cents: number;
  distanceKm: number | null;
  mode: 'calculated' | 'free' | 'disabled' | 'fallback';
  reason?: string;
};

type Coordinates = { latitude: number; longitude: number };

type CacheEntry<T> = { expiresAt: number; value: T };

type FreightSettings = {
  freight_enabled?: boolean;
  free_shipping_enabled?: boolean;
  freight_per_km_cents?: number;
  freight_per_km_brl?: number;
  store_postal_code?: string | null;
  delivery_origin_mode?: 'store_postal_code' | 'current_location';
  current_origin_latitude?: number | null;
  current_origin_longitude?: number | null;
};

const GEO_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h
const geocodeCache = new Map<string, CacheEntry<Coordinates | null>>();

function logMetric(event: string, details: Record<string, unknown>) {
  console.info('[freight-metric]', event, details);
}

export function sanitizePostalCode(value?: string | null) {
  return (value || '').replace(/\D/g, '').slice(0, 8);
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function parseFreightPerKm(settings: FreightSettings) {
  const raw = settings.freight_per_km_brl ?? Number(settings.freight_per_km_cents || 0) / 100;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 9000, retries = 1) {
  const startedAt = Date.now();
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'pt-BR'
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      logMetric('external_success', {
        url,
        latencyMs: Date.now() - startedAt,
        attempt: attempt + 1
      });
      return data;
    } catch (error) {
      lastError = error;
      logMetric('external_failure', {
        url,
        latencyMs: Date.now() - startedAt,
        attempt: attempt + 1,
        message: error instanceof Error ? error.message : 'unknown'
      });

      if (attempt < retries) {
        await sleep(250 * (attempt + 1));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha de integração externa');
}

function getCachedGeocode(query: string) {
  const cached = geocodeCache.get(query);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    geocodeCache.delete(query);
    return null;
  }
  return cached.value;
}

function setCachedGeocode(query: string, value: Coordinates | null) {
  geocodeCache.set(query, { value, expiresAt: Date.now() + GEO_CACHE_TTL_MS });
}

async function geocodeByQuery(query: string) {
  const cached = getCachedGeocode(query);
  if (cached !== null) {
    return cached;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const data = await fetchJsonWithTimeout(url, 9000, 1);
    const first = data?.[0];
    if (!first?.lat || !first?.lon) {
      setCachedGeocode(query, null);
      return null;
    }

    const value = {
      latitude: Number(first.lat),
      longitude: Number(first.lon)
    };
    setCachedGeocode(query, value);
    return value;
  } catch {
    return null;
  }
}

async function geocodeByPostalCode(postalCode: string) {
  const normalized = sanitizePostalCode(postalCode);
  if (!normalized) return null;

  const formatted = normalized.length === 8 ? `${normalized.slice(0, 5)}-${normalized.slice(5)}` : normalized;
  const candidates = [
    `${formatted}, Brasil`,
    `${normalized}, Brasil`,
    `CEP ${formatted}, Brasil`
  ];

  for (const query of candidates) {
    const geocoded = await geocodeByQuery(query);
    if (geocoded) return geocoded;
  }

  // Fallback: tenta enriquecer pelo ViaCEP para melhorar geocodificação em CEPs pouco indexados no Nominatim
  try {
    const viaCep = await fetchJsonWithTimeout(`https://viacep.com.br/ws/${normalized}/json/`, 8000, 1);
    if (!viaCep?.erro) {
      const broadAddress = [viaCep.localidade, viaCep.uf, 'Brasil'].filter(Boolean).join(', ');
      const broadResult = await geocodeByQuery(broadAddress);
      if (broadResult) return broadResult;

      const specificAddress = [viaCep.logradouro, viaCep.bairro, viaCep.localidade, viaCep.uf, 'Brasil']
        .filter(Boolean)
        .join(', ');
      const specificResult = await geocodeByQuery(specificAddress);
      if (specificResult) return specificResult;
    }
  } catch {
    // mantém fallback seguro para frete sem interromper checkout
  }

  return null;
}

export async function resolveFreightOrigin(settings: FreightSettings) {
  const hasCurrentOrigin =
    settings.delivery_origin_mode === 'current_location' &&
    settings.current_origin_latitude != null &&
    settings.current_origin_longitude != null;

  if (hasCurrentOrigin) {
    return {
      latitude: Number(settings.current_origin_latitude),
      longitude: Number(settings.current_origin_longitude)
    };
  }

  const storePostalCode = sanitizePostalCode(settings.store_postal_code);
  if (!storePostalCode) return null;

  return geocodeByPostalCode(storePostalCode);
}

export async function resolveDestinationCoordinates(destination: FreightDestination) {
  const lat = destination.latitude ?? null;
  const lon = destination.longitude ?? null;

  if (lat != null && lon != null) {
    return { latitude: Number(lat), longitude: Number(lon) };
  }

  const postalCode = sanitizePostalCode(destination.postalCode);

  if (destination.fullAddress && postalCode) {
    const fromAddress = await geocodeByQuery(`${destination.fullAddress}, ${postalCode}, Brasil`);
    if (fromAddress) return fromAddress;
  }

  if (postalCode) {
    const fromPostalCode = await geocodeByPostalCode(postalCode);
    if (fromPostalCode) return fromPostalCode;
  }

  return null;
}

export async function estimateFreightFromInput(settings: FreightSettings, destination: FreightDestination): Promise<FreightQuoteResult> {
  if (!settings.freight_enabled || settings.free_shipping_enabled) {
    return { cents: 0, distanceKm: null, mode: settings.free_shipping_enabled ? 'free' : 'disabled' };
  }

  const freightPerKmBrl = parseFreightPerKm(settings);
  if (freightPerKmBrl <= 0) {
    return { cents: 0, distanceKm: null, mode: 'fallback', reason: 'Frete por km inválido.' };
  }

  const origin = await resolveFreightOrigin(settings);
  if (!origin) {
    return { cents: 0, distanceKm: null, mode: 'fallback', reason: 'Origem de entrega indisponível.' };
  }

  const dest = await resolveDestinationCoordinates(destination);
  if (!dest) {
    return { cents: 0, distanceKm: null, mode: 'fallback', reason: 'Destino não geocodificado.' };
  }

  const distanceKm = haversineKm(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
  return {
    cents: Math.round(distanceKm * freightPerKmBrl * 100),
    distanceKm,
    mode: 'calculated'
  };
}
