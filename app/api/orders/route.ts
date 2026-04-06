import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrder } from '@/services/order-service';

const schema = z.object({
  customerName: z.string().min(3),
  customerPhone: z.string().regex(/^\d{10,13}$/),
  orderType: z.enum(['delivery', 'pickup']),
  paymentMethod: z.enum(['pix', 'credit_card', 'debit_card']),
  address: z.string().optional(),
  postalCode: z.string().nullable().optional(),
  mapsLink: z.string().url().nullable().optional(),
  addressConfirmed: z.boolean().optional(),
  freightCents: z.number().int().nonnegative().optional(),
  customerLatitude: z.number().min(-90).max(90).nullable().optional(),
  customerLongitude: z.number().min(-180).max(180).nullable().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        name: z.string(),
        priceCents: z.number().int().nonnegative(),
        quantity: z.number().int().positive(),
        size: z.object({
          id: z.string(),
          label: z.string(),
          volumeMl: z.number().int().positive(),
          priceCents: z.number().int().nonnegative()
        }),
        includedToppings: z.array(
          z.object({ toppingId: z.string(), name: z.string(), priceCents: z.number().int().nonnegative() })
        ),
        optionalToppings: z.array(
          z.object({ toppingId: z.string(), name: z.string(), priceCents: z.number().int().nonnegative() })
        ),
        toppings: z.array(z.string()).default([])
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
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Dados inválidos ou erro interno.',
        details: error instanceof Error ? error.message : 'Falha inesperada'
      },
      { status: 400 }
    );
  }
}
