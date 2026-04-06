import { NextRequest, NextResponse } from 'next/server';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
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

    const incoming = await request.formData();
    const file = incoming.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo de imagem não enviado.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Apenas imagens são permitidas.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'A imagem excede o limite de 8MB.' }, { status: 400 });
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : {};

    if (!response.ok) {
      const cloudinaryMessage = data?.error?.message || 'Erro desconhecido do Cloudinary.';
      return NextResponse.json(
        {
          error: 'Falha no upload para Cloudinary.',
          details: cloudinaryMessage
        },
        { status: response.status }
      );
    }

    if (!data?.secure_url) {
      return NextResponse.json(
        {
          error: 'Cloudinary não retornou URL da imagem.'
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: data.secure_url, public_id: data.public_id ?? null }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erro inesperado ao processar upload.',
        details: error instanceof Error ? error.message : 'Erro interno'
      },
      { status: 500 }
    );
  }
}
