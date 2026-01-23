import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-extension-secret');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const extensionSecretHeader = req.headers['x-extension-secret'];
    const requiredSecret = process.env.EXTENSION_SECRET;
    if (requiredSecret && extensionSecretHeader !== requiredSecret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Missing JSON body' });
      return;
    }

    const { userId: bodyUserId, userEmail, url, title, category, description, favicon, created_at } = req.body;
    if (!url || !title || !category) {
      res.status(400).json({ error: 'Missing required fields (url, title, category)' });
      return;
    }

    // Validate URL format
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        res.status(400).json({ error: 'Invalid URL: must start with http:// or https://' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    // Sanitize inputs (basic XSS prevention)
    const sanitize = (str) => str ? String(str).slice(0, 1000).replace(/<[^>]*>/g, '') : null;
    const sanitizedTitle = sanitize(title);
    const sanitizedCategory = sanitize(category);
    const sanitizedDescription = sanitize(description);

    // Use the provided userId directly
    let resolvedUserId = bodyUserId;

    if (!resolvedUserId) {
      res.status(400).json({ error: 'Missing userId - authentication required' });
      return;
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl) {
      res.status(500).json({ error: 'SUPABASE_URL not configured on server' });
      return;
    }
    if (!serviceKey) {
      res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server' });
      return;
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (!resolvedUserId) {
      res.status(400).json({ error: 'Missing userId or user not found for userEmail' });
      return;
    }

    // Auto-create category if it doesn't exist (and not a system category)
    if (sanitizedCategory &&
      sanitizedCategory !== 'Recently Added' &&
      sanitizedCategory !== 'Uncategorized') {
      try {
        // Check if category already exists
        const { data: existingCat } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', resolvedUserId)
          .eq('name', sanitizedCategory)
          .single();

        // Create if doesn't exist
        if (!existingCat) {
          await supabase
            .from('categories')
            .insert({
              name: sanitizedCategory,
              user_id: resolvedUserId
            });
          console.log(`Auto-created category: ${sanitizedCategory}`);
        }
      } catch (catError) {
        // Ignore category creation errors - best effort
        console.log('Category auto-create skipped:', catError?.message);
      }
    }

    const { error } = await supabase.from('websites').insert({
      url,
      title: sanitizedTitle,
      category: sanitizedCategory,
      description: sanitizedDescription,
      favicon: favicon || null,
      user_id: resolvedUserId,
      created_at: created_at || new Date().toISOString(),
    });

    if (error) {
      res.status(500).json({ error: `Supabase insert failed: ${error.message}` });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('save-tab error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}


