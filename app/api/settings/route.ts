export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getStoreSettings } from '@/services/product-service';

export async function GET() {
  try {
    const settings = await getStoreSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Falha ao carregar configurações da loja.',
        details: error instanceof Error ? error.message : 'Erro interno'
      },
      { status: 500 }
    );
  }
}
