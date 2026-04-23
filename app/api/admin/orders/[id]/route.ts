import { isAdminAuthenticated } from '@/lib/auth';
import { deleteOrder } from '@/services/order-service';
import { NextResponse } from 'next/server';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  await deleteOrder(params.id);
  return NextResponse.json({ ok: true });
}
