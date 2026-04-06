import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = String(body?.query || '').trim();
    if (!query) return NextResponse.json({ error: 'Endereço inválido.' }, { status: 400 });

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Refrescando/1.0 (painel admin)' },
      cache: 'no-store'
    });

    if (!res.ok) return NextResponse.json({ error: 'Falha ao consultar endereço.' }, { status: 502 });

    const results = await res.json();
    const first = Array.isArray(results) ? results[0] : null;
    if (!first) return NextResponse.json({ error: 'Endereço não encontrado.' }, { status: 404 });

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;

    return NextResponse.json({ formattedAddress: first.display_name, lat, lng, mapsLink });
  } catch (error) {
    return NextResponse.json({ error: 'Não foi possível validar endereço.', details: error instanceof Error ? error.message : 'Falha inesperada' }, { status: 400 });
  }
}
