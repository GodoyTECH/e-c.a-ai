import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { imageBase64 } = await request.json();
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_UPLOAD_PRESET) {
    return NextResponse.json({ error: 'Cloudinary não configurado.' }, { status: 400 });
  }

  const data = new URLSearchParams({
    file: imageBase64,
    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: data
    }
  );

  const json = await response.json();
  return NextResponse.json({ url: json.secure_url });
}
