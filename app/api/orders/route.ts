import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrder } from '@/services/order-service';

const schema = z.object({
  customerName: z.string().min(3),
  customerPhone: z.string().regex(/^\d{10,13}$/),
  orderType: z.enum(['delivery', 'pickup']),
  paymentMethod: z.enum(['pix', 'credit_card', 'debit_card']),
  address: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        name: z.string(),
        priceCents: z.number().int().nonnegative(),
        quantity: z.number().int().positive()
      })
    )
    .min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const idempotencyKey = request.headers.get('x-idempotency-key') || undefined;
    const order = await createOrder(parsed, idempotencyKey);
    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Dados inválidos ou erro interno.' }, { status: 400 });
  }
}
