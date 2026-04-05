import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { imageBase64 } = await request.json();
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return NextResponse.json({ error: 'Imagem inválida.' }, { status: 400 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_UPLOAD_PRESET) {
    return NextResponse.json(
      {
        error: 'Cloudinary não configurado.',
        missing: {
          CLOUDINARY_CLOUD_NAME: !process.env.CLOUDINARY_CLOUD_NAME,
          CLOUDINARY_UPLOAD_PRESET: !process.env.CLOUDINARY_UPLOAD_PRESET
        }
      },
      { status: 400 }
    );
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
  if (!response.ok) {
    return NextResponse.json(
      {
        error: 'Falha no upload para Cloudinary.',
        details: json?.error?.message || 'Erro desconhecido do Cloudinary.'
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ url: json.secure_url });
}
