import { isAdminAuthenticated } from '@/lib/auth';
import { updateOrderStatus } from '@/services/order-service';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  status: z.enum(['confirmed', 'rejected', 'preparing', 'delivered']),
  reason: z.string().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.parse(body);
  await updateOrderStatus(params.id, parsed.status, parsed.reason);
  return NextResponse.json({ ok: true });
}
