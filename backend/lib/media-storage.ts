import { v2 as cloudinary } from 'cloudinary';
import { createSupabaseServerClient } from './supabase-client';

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    (process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) &&
    (process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY) &&
    (process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET)
  );
}

export function getCloudinaryClient() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET;

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
  return cloudinary;
}

export interface UploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  storageProvider: 'cloudinary' | 'supabase';
}

/**
 * Uploads an image either to Cloudinary (if configured) or to Supabase Storage.
 * Accepts a Base64 data URI string or a Buffer.
 */
export async function uploadMediaImage(
  fileContent: string | Buffer,
  fileName: string,
  folder: string = 'baytak_noor'
): Promise<UploadResult> {
  const targetFolder = process.env.CLOUDINARY_FOLDER || folder;

  // If Cloudinary credentials exist, use Cloudinary for best image optimization & CDN
  if (isCloudinaryConfigured()) {
    const cld = getCloudinaryClient();
    const uploadSource = Buffer.isBuffer(fileContent)
      ? `data:image/jpeg;base64,${fileContent.toString('base64')}`
      : fileContent;

    const res = await cld.uploader.upload(uploadSource, {
      folder: targetFolder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return {
      url: res.secure_url,
      publicId: res.public_id,
      bytes: res.bytes,
      format: res.format,
      storageProvider: 'cloudinary'
    };
  }

  // Fallback to Supabase Storage 'media' bucket
  const supabase = createSupabaseServerClient();
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${cleanName}`;

  let buffer: Buffer;
  let contentType = 'image/jpeg';

  if (typeof fileContent === 'string') {
    if (fileContent.startsWith('data:')) {
      const parts = fileContent.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) contentType = match[1];
      buffer = Buffer.from(parts[1], 'base64');
    } else {
      buffer = Buffer.from(fileContent, 'utf-8');
    }
  } else {
    buffer = fileContent;
  }

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(path, buffer, { contentType, upsert: true });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: pubUrlData } = supabase.storage.from('media').getPublicUrl(path);

  return {
    url: pubUrlData.publicUrl,
    publicId: path,
    bytes: buffer.length,
    format: contentType.split('/')[1] || 'jpeg',
    storageProvider: 'supabase'
  };
}
