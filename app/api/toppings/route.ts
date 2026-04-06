import { NextResponse } from 'next/server';
import { listToppings } from '@/services/product-service';

export async function GET() {
  try {
    const toppings = await listToppings(false);
    return NextResponse.json(toppings);
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao carregar acompanhamentos.', details: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
