import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { listToppings, seedDefaultToppings, updateToppingStatus } from '@/services/product-service';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const toppings = await listToppings(true);
  return NextResponse.json(toppings);
}

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  await seedDefaultToppings();
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  if (!body?.id || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  await updateToppingStatus(body.id, body.active);
  return NextResponse.json({ ok: true });
}
