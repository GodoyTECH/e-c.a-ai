import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

type UploadRequest = {
  imageBase64?: string;
  fileName?: string;
  productName?: string;
};

function sanitizeDisplayName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/]/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function sanitizeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\\/]/g, '-')
    .replace(/[^a-z0-9-\s_]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function isCloudinarySigned() {
  return Boolean(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UploadRequest;
    const imageBase64 = body?.imageBase64;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Imagem inválida.' }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return NextResponse.json(
        {
          error: 'Cloudinary não configurado.',
          missing: { CLOUDINARY_CLOUD_NAME: true }
        },
        { status: 400 }
      );
    }

    const rawBaseName = body.productName || body.fileName || 'produto';
    const displayName = sanitizeDisplayName(rawBaseName) || 'produto';
    const slugBase = sanitizeSlug(rawBaseName) || 'produto';
    const timestamp = Math.floor(Date.now() / 1000);
    const uniqueSuffix = String(Date.now());
    const publicId = `${slugBase}-${uniqueSuffix}`;
    const folder = 'acai-da-casa/produtos';
    const endpoint = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

    const params = new URLSearchParams({
      file: imageBase64,
      folder,
      asset_folder: folder,
      display_name: displayName,
      public_id: publicId
    });

    const signed = isCloudinarySigned();

    if (signed) {
      const signatureBase = [
        `asset_folder=${folder}`,
        `display_name=${displayName}`,
        `folder=${folder}`,
        `public_id=${publicId}`,
        `timestamp=${timestamp}`
      ].join('&');

      const signature = crypto
        .createHash('sha1')
        .update(`${signatureBase}${process.env.CLOUDINARY_API_SECRET}`)
        .digest('hex');

      params.set('public_id', publicId);
      params.set('timestamp', String(timestamp));
      params.set('api_key', process.env.CLOUDINARY_API_KEY as string);
      params.set('signature', signature);
    } else {
      if (!process.env.CLOUDINARY_UPLOAD_PRESET) {
        return NextResponse.json(
          {
            error: 'Cloudinary não configurado.',
            missing: { CLOUDINARY_UPLOAD_PRESET: true }
          },
          { status: 400 }
        );
      }
      params.set('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: params
    });

    const json = await response.json();
    if (!response.ok) {
      const cloudinaryMessage = json?.error?.message || 'Erro desconhecido do Cloudinary.';
      console.error('Falha no upload Cloudinary', {
        status: response.status,
        message: cloudinaryMessage,
        signed,
        displayName,
        folder,
        publicId: params.get('public_id')
      });

      return NextResponse.json(
        {
          error: 'Falha no upload para Cloudinary.',
          details: cloudinaryMessage
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: json.secure_url, public_id: json.public_id });
  } catch (error) {
    console.error('Erro inesperado no upload', error);
    return NextResponse.json(
      {
        error: 'Erro inesperado ao processar upload.',
        details: error instanceof Error ? error.message : 'Erro interno'
      },
      { status: 500 }
    );
  }
}
