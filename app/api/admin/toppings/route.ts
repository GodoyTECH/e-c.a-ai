import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { deleteTopping, listToppings, seedDefaultToppings, upsertTopping } from '@/services/product-service';

function parsePriceToCents(value: unknown) {
  if (typeof value === 'number') return Math.max(0, Math.round(value));
  if (typeof value !== 'string') return 0;
  const normalized = value.trim().replace(',', '.');
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100);
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const toppings = await listToppings(true);
  return NextResponse.json(toppings);
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.seed === true) {
    await seedDefaultToppings();
    return NextResponse.json({ ok: true });
  }

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Nome obrigatório.' }, { status: 400 });
  }

  const id = await upsertTopping({
    id: body.id,
    name: body.name,
    price_cents: parsePriceToCents(body.price_cents),
    active: typeof body.active === 'boolean' ? body.active : true,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    archived: typeof body.archived === 'boolean' ? body.archived : false
  });

  return NextResponse.json({ ok: true, id });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  if (!body?.id) {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  await upsertTopping({
    id: body.id,
    name: String(body.name || '').trim(),
    price_cents: parsePriceToCents(body.price_cents),
    active: typeof body.active === 'boolean' ? body.active : true,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    archived: typeof body.archived === 'boolean' ? body.archived : false
  });
  return NextResponse.json({ ok: true });
}


export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  await deleteTopping(id);
  return NextResponse.json({ ok: true });
}
