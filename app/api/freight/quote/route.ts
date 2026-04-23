import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { estimateFreightFromInput, sanitizePostalCode } from '@/lib/freight';
import { getStoreSettings } from '@/services/product-service';

const schema = z.object({
  postalCode: z.string().nullable().optional(),
  fullAddress: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);

    const settings = await getStoreSettings();
    const quote = await estimateFreightFromInput(settings, {
      postalCode: sanitizePostalCode(parsed.postalCode),
      fullAddress: parsed.fullAddress || null,
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null
    });

    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Falha ao calcular frete.',
        details: error instanceof Error ? error.message : 'Erro interno'
      },
      { status: 400 }
    );
  }
}
