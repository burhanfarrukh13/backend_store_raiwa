import { setCorsHeaders, createSupabaseServerClient } from '../../lib/supabase-client';
import { uploadMediaImage } from '../../lib/media-storage';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List media assets ---
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return c.json({ error: error.message }, 500);

    // Format for admin client
    const assets = (data || []).map((m: any) => ({
      id: m.id,
      name: m.original_name || m.file_name,
      url: m.path.startsWith('http') ? m.path : (m.public_url || m.path),
      alt: m.alt_text || m.file_name,
      size: m.size_bytes ? `${Math.round(m.size_bytes / 1024)} KB` : '150 KB',
      uploadedAt: m.created_at ? m.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
    }));

    return c.json({ data: assets }, 200);
  }

  // --- POST: Upload new media asset (Direct API file or base64) ---
  if (method === 'POST') {
    try {
      const body = await c.req.json();
      const { file, name, alt } = body;

      if (!file) {
        return c.json({ error: 'Missing file data (base64 data URI required)' }, 400);
      }

      const fileName = name || `media_${Date.now()}`;
      const uploadRes = await uploadMediaImage(file, fileName, 'catalog');

      // Record in Supabase media_assets table
      const { data: record, error: dbError } = await supabase
        .from('media_assets')
        .insert([{
          file_name: fileName,
          original_name: fileName,
          bucket: uploadRes.storageProvider,
          path: uploadRes.url,
          mime_type: `image/${uploadRes.format}`,
          size_bytes: uploadRes.bytes,
          alt_text: alt || fileName,
          status: 'active'
        }])
        .select()
        .single();

      if (dbError) {
        console.warn('DB recording error for media asset:', dbError.message);
      }

      return c.json({
        success: true,
        data: {
          id: record?.id || uploadRes.publicId,
          url: uploadRes.url,
          name: fileName,
          size: `${Math.round(uploadRes.bytes / 1024)} KB`,
          provider: uploadRes.storageProvider
        }
      }, 201);
    } catch (err: any) {
      console.error('Media upload failure:', err);
      const detail = err?.message || String(err);
      return c.json({ error: `Upload failed: ${detail}` }, 500);
    }
  }

  // --- DELETE: Soft delete media asset ---
  if (method === 'DELETE') {
    const id = c.req.query('id');
    if (!id) return c.json({ error: 'Media ID required' }, 400);

    const { error } = await supabase
      .from('media_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}
