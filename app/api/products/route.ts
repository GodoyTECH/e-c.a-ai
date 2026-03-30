import { NextResponse } from 'next/server';
import { listStoreData } from '@/services/product-service';

export async function GET() {
  const data = await listStoreData();
  return NextResponse.json(data);
}
