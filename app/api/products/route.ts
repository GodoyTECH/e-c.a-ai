export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { listStoreData } from '@/services/product-service';

export async function GET() {
  try {
    const data = await listStoreData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Falha ao carregar produtos.',
        details: error instanceof Error ? error.message : 'Erro interno'
      },
      { status: 500 }
    );
  }
}
