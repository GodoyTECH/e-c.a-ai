import { NextRequest, NextResponse } from 'next/server';
import { getStoreSettings } from '@/services/product-service';

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function geocode(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Refrescando/1.0 (frete)' },
    cache: 'no-store'
  });
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first) return null;
  return { lat: Number(first.lat), lng: Number(first.lon) };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const destinationLat = Number(body?.destinationLat);
    const destinationLng = Number(body?.destinationLng);
    if (!Number.isFinite(destinationLat) || !Number.isFinite(destinationLng)) {
      return NextResponse.json({ error: 'Destino inválido.' }, { status: 400 });
    }

    const settings = await getStoreSettings();
    if (!settings.delivery_fee_enabled) {
      return NextResponse.json({ distanceKm: 0, feeCents: 0, mode: 'free' });
    }

    if (!settings.store_address?.trim()) {
      return NextResponse.json({ error: 'Configure o endereço da loja para cálculo de frete.' }, { status: 400 });
    }

    const origin = await geocode(settings.store_address);
    if (!origin) return NextResponse.json({ error: 'Não foi possível localizar o endereço da loja.' }, { status: 400 });

    const distanceKm = haversineKm(origin.lat, origin.lng, destinationLat, destinationLng);
    const feeCents = Math.round(distanceKm * settings.delivery_fee_per_km_cents);

    return NextResponse.json({ distanceKm, feeCents, mode: 'distance' });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao calcular frete.', details: error instanceof Error ? error.message : 'Erro interno' }, { status: 400 });
  }
}
