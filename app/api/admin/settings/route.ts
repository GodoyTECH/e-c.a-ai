import { isAdminAuthenticated } from '@/lib/auth';
import { getStoreSettings, updateStoreSettings } from '@/services/product-service';
import { NextRequest, NextResponse } from 'next/server';

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

  const body = await request.json();
  await updateStoreSettings(body);
  return NextResponse.json({ ok: true });
}
