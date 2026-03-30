import { isAdminAuthenticated } from '@/lib/auth';
import { deleteProduct, listAdminProducts, upsertProduct } from '@/services/product-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  return NextResponse.json(await listAdminProducts());
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const id = await upsertProduct(body);
  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}
