import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Allow simple navigations
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { url, title, category, email, secret } = req.query || {};

    const requiredSecret = process.env.EXTENSION_SECRET;
    if (requiredSecret && secret !== requiredSecret) {
      respondHtml(res, 401, 'Unauthorized: secret mismatch. Pass ?secret=YOUR_SECRET');
      return;
    }

    if (!url) {
      respondHtml(res, 400, 'Missing url (add ?url=...)');
      return;
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl) {
      respondHtml(res, 500, 'Server not configured: SUPABASE_URL missing');
      return;
    }
    if (!serviceKey) {
      respondHtml(res, 500, 'Server not configured: SUPABASE_SERVICE_ROLE_KEY missing');
      return;
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve user id
    let resolvedUserId = undefined;
    if (!email) {
      respondHtml(res, 400, 'Missing email (add &email=YOUR_EMAIL)');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', String(email))
        .limit(1)
        .maybeSingle();
      if (error) {
        respondHtml(res, 500, `User lookup failed: ${error.message}`);
        return;
      }
      resolvedUserId = data?.id;
    } catch (e) {
      respondHtml(res, 500, `User lookup exception: ${e?.message || e}`);
      return;
    }

    if (!resolvedUserId) {
      respondHtml(res, 400, 'Unknown email: log into the dashboard once with this email');
      return;
    }

    const safeUrl = String(url);
    const safeTitle = (title ? String(title) : safeUrl).slice(0, 500);
    const safeCategory = (category ? String(category) : 'Uncategorized').slice(0, 100);

    const { error } = await supabase.from('websites').insert({
      url: safeUrl,
      title: safeTitle,
      category: safeCategory,
      description: null,
      favicon: null,
      user_id: resolvedUserId,
      created_at: new Date().toISOString(),
    });

    if (error) {
      respondHtml(res, 500, `Save failed: ${error.message}`);
      return;
    }

    respondHtmlAutoClose(res, 200, 'Saved to Memorai. You can close this tab.');
  } catch (err) {
    respondHtml(res, 500, `Internal Server Error: ${err?.message || err}`);
  }
}

function respondHtml(res, status, message) {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8').end(`<!doctype html><html><body style="font-family:system-ui;padding:16px;">${escapeHtml(message)}</body></html>`);
}

function respondHtmlAutoClose(res, status, message) {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8').end(`<!doctype html><html><body style="font-family:system-ui;padding:16px;">${escapeHtml(message)}<script>setTimeout(()=>window.close(),1000);</script></body></html>`);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>\"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}
