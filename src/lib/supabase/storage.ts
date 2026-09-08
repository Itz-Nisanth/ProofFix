import { supabaseServer } from './server';
import { supabase } from './client';
import { supabaseAdmin } from './admin';

export async function uploadEvidenceImage(
  dataUrlOrBase64: string,
  bucket: 'incident-evidence' | 'resolution-evidence' = 'incident-evidence',
  fileNamePrefix: string = 'capture'
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isConfigured = supabaseUrl && !supabaseUrl.includes('placeholder-project');

  if (!isConfigured) {
    // Return original data URL or photo if Supabase remote storage is not yet connected
    return dataUrlOrBase64;
  }

  try {
    // 1. Extract base64 payload & mime type
    let mimeType = 'image/jpeg';
    let base64Payload = dataUrlOrBase64;

    const mimeMatch = dataUrlOrBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
      base64Payload = dataUrlOrBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    }

    // 2. Convert to Buffer
    const buffer = Buffer.from(base64Payload, 'base64');
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const filePath = `${fileNamePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // 3. Upload to Supabase Storage bucket
    const client = supabaseAdmin || supabaseServer || supabase;
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn(`Supabase Storage upload to "${bucket}" warning:`, uploadError.message);
      return dataUrlOrBase64;
    }

    // 4. Return Public Access URL
    const { data } = client.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl || dataUrlOrBase64;
  } catch (err) {
    console.error('Failed to upload image to Supabase storage:', err);
    return dataUrlOrBase64;
  }
}
