import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { lookupCep } from '@/lib/address-lookup';

const schema = z.object({
  postalCode: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const result = await lookupCep(parsed.postalCode);

    if (!result) {
      return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Falha ao consultar CEP.',
        details: error instanceof Error ? error.message : 'Erro interno'
      },
      { status: 400 }
    );
  }
}
