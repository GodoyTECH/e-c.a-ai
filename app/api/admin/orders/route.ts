import { isAdminAuthenticated } from '@/lib/auth';
import { listOrders } from '@/services/order-service';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const orders = await listOrders();
  return NextResponse.json(orders);
}
