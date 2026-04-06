import { isAdminAuthenticated } from '@/lib/auth';
import { getStoreSettings, updateStoreSettings } from '@/services/product-service';
import { NextRequest, NextResponse } from 'next/server';

function normalizeFreightValue(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  return 0;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  return NextResponse.json(await getStoreSettings());
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const freightPerKm = normalizeFreightValue(body?.freight_per_km_brl);

    await updateStoreSettings({
      ...body,
      freight_per_km_brl: freightPerKm,
      freight_per_km_cents:
        typeof body?.freight_per_km_cents === 'number' && Number.isFinite(body.freight_per_km_cents)
          ? Math.max(0, Math.round(body.freight_per_km_cents))
          : Math.round(freightPerKm * 100)
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Não foi possível salvar configurações.',
        details: error instanceof Error ? error.message : 'Erro interno'
      },
      { status: 500 }
    );
  }
}
