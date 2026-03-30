import { NextResponse } from 'next/server';
import { getStoreSettings } from '@/services/product-service';

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json(settings);
}
