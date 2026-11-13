import { setCorsHeaders, createSupabaseServerClient } from '../../lib/supabase-client';
import { uploadMediaImage } from '../../lib/media-storage';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List products with categories, variants, and images ---
  if (method === 'GET') {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variants (*),
        product_images (*),
        product_categories (category_id, categories (id, name, slug))
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // Transform to standard format expected by admin UI
    const formatted = (products || []).map((p: any) => {
      const variants = (p.product_variants || []).filter((v: any) => !v.deleted_at);
      const images = (p.product_images || []).filter((i: any) => !i.deleted_at);
      const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock_qty || 0), 0);
      const catName = p.product_categories?.[0]?.categories?.name || 'Uncategorized';

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        category: catName,
        price: Number(p.price || 0),
        compareAt: Number(p.compare_at_price || 0),
        cost: Number(p.cost_price || 0),
        stock: totalStock,
        status: p.status === 'active' ? 'Active' : p.status === 'archived' ? 'Archived' : 'Draft',
        description: p.description || '',
        image: images[0]?.url || 'assets/logo.png',
        images: images.map((i: any) => i.url),
        variants: variants.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          size: v.size || '',
          color: v.color || '',
          price: Number(v.price || p.price || 0),
          stock: v.stock_qty || 0,
        })),
        createdAt: p.created_at ? p.created_at.split('T')[0] : '',
      };
    });

    return c.json({ data: formatted }, 200);
  }

  // --- POST: Create product with variants and optional image ---
  if (method === 'POST') {
    try {
      const payload = await c.req.json();
      const {
        name,
        price,
        compareAt,
        cost,
        category,
        categoryId,
        description,
        sku,
        status = 'Active',
        image,
        variants = [],
      } = payload;

      if (!name) return c.json({ error: 'Product name is required' }, 400);

      const basePrice = Number(price) || 0;
      const baseSku = sku || `BN-${Date.now().toString(36).toUpperCase()}`;
      const productSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + `-${Date.now().toString(36)}`;

      // 1. Upload image if provided as base64 data URI
      let imageUrl = image;
      if (image && typeof image === 'string' && image.startsWith('data:')) {
        try {
          const uploadRes = await uploadMediaImage(image, `${productSlug}-hero`, 'products');
          imageUrl = uploadRes.url;
        } catch (imgErr: any) {
          console.warn('Image upload error on product create:', imgErr.message);
        }
      }

      // 2. Insert product record into Supabase
      const { data: newProduct, error: prodErr } = await supabase
        .from('products')
        .insert([{
          name,
          slug: productSlug,
          sku: baseSku,
          description: description || '',
          price: basePrice,
          compare_at_price: Number(compareAt) || 0,
          cost_price: Number(cost) || 0,
          status: status === 'Active' ? 'active' : 'draft',
          has_variants: variants.length > 0,
        }])
        .select()
        .single();

      if (prodErr || !newProduct) {
        return c.json({ error: prodErr?.message || 'Failed to create product' }, 400);
      }

      const productId = newProduct.id;

      // 3. Link image if exists
      if (imageUrl && !imageUrl.startsWith('data:')) {
        await supabase.from('product_images').insert([{
          product_id: productId,
          url: imageUrl,
          alt_text: name,
          sort_order: 0,
        }]);
      }

      // 4. Create variants
      if (variants.length > 0) {
        const variantRows = variants.map((v: any, index: number) => ({
          product_id: productId,
          sku: v.sku || `${baseSku}-${index + 1}`,
          size: v.size || null,
          color: v.color || null,
          price: Number(v.price) || basePrice,
          stock_qty: Number(v.stock) || 0,
          position: index,
        }));
        await supabase.from('product_variants').insert(variantRows);
      } else {
        // Fallback default variant so checkout and cart can reference it
        await supabase.from('product_variants').insert([{
          product_id: productId,
          sku: `${baseSku}-DEF`,
          size: 'Standard',
          price: basePrice,
          stock_qty: 99,
          position: 0,
        }]);
      }

      // 5. Link category if specified
      if (categoryId) {
        await supabase.from('product_categories').insert([{ product_id: productId, category_id: categoryId }]);
      } else if (category) {
        // Find category by name or slug
        const { data: foundCat } = await supabase
          .from('categories')
          .select('id')
          .or(`name.eq.${category},slug.eq.${category.toLowerCase().replace(/\s+/g, '-')}`)
          .maybeSingle();

        if (foundCat) {
          await supabase.from('product_categories').insert([{ product_id: productId, category_id: foundCat.id }]);
        }
      }

      return c.json({ success: true, data: { id: productId, name, slug: productSlug } }, 201);
    } catch (err: any) {
      console.error('Create product failed:', err);
      return c.json({ error: err.message || 'Internal server error' }, 500);
    }
  }

  // --- PUT: Update product ---
  if (method === 'PUT') {
    try {
      const productId = c.req.query('id');
      if (!productId) return c.json({ error: 'Product ID required' }, 400);

      const payload = await c.req.json();
      const {
        name,
        price,
        compareAt,
        cost,
        description,
        status,
        image,
        variants = [],
      } = payload;

      let imageUrl = image;
      if (image && typeof image === 'string' && image.startsWith('data:')) {
        try {
          const uploadRes = await uploadMediaImage(image, `product_${productId}_update`, 'products');
          imageUrl = uploadRes.url;
        } catch (imgErr) {}
      }

      // Update main product details
      const updateData: any = { updated_at: new Date().toISOString() };
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = Number(price);
      if (compareAt !== undefined) updateData.compare_at_price = Number(compareAt);
      if (cost !== undefined) updateData.cost_price = Number(cost);
      if (status) updateData.status = status.toLowerCase() === 'active' ? 'active' : 'draft';

      await supabase.from('products').update(updateData).eq('id', productId);

      // Update image
      if (imageUrl && !imageUrl.startsWith('data:')) {
        await supabase.from('product_images').delete().eq('product_id', productId);
        await supabase.from('product_images').insert([{
          product_id: productId,
          url: imageUrl,
          alt_text: name || 'Product image',
          sort_order: 0,
        }]);
      }

      // Update variants if provided
      if (variants.length > 0) {
        await supabase.from('product_variants').delete().eq('product_id', productId);
        const variantRows = variants.map((v: any, index: number) => ({
          product_id: productId,
          sku: v.sku || `SKU-${Date.now()}-${index}`,
          size: v.size || null,
          color: v.color || null,
          price: Number(v.price) || Number(price) || 0,
          stock_qty: Number(v.stock) || 0,
          position: index,
        }));
        await supabase.from('product_variants').insert(variantRows);
      }

      return c.json({ success: true, data: { id: productId } }, 200);
    } catch (err: any) {
      return c.json({ error: err.message || 'Update failed' }, 500);
    }
  }

  // --- DELETE: Soft delete product ---
  if (method === 'DELETE') {
    const productId = c.req.query('id');
    if (!productId) return c.json({ error: 'Product ID required' }, 400);

    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString(), status: 'archived' })
      .eq('id', productId);

    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}
