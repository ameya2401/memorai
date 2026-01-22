import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // CORS headers similar to save-tab
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

        const { userId, bookmarks } = req.body;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
            res.status(400).json({ error: 'No bookmarks provided' });
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
                persistSession: false,
            },
        });

        // Normalize and collect URLs
        const urls = bookmarks
            .map((b) => (b && typeof b.url === 'string' ? b.url.trim() : ''))
            .filter((u) => u);

        if (!urls.length) {
            res.status(400).json({ error: 'All bookmark URLs are empty/invalid' });
            return;
        }

        // Fetch existing websites for deduplication by (user_id, url)
        const { data: existing, error: existingError } = await supabase
            .from('websites')
            .select('url')
            .eq('user_id', userId)
            .in('url', urls);

        if (existingError) {
            res.status(500).json({ error: `Supabase select failed: ${existingError.message}` });
            return;
        }

        const existingUrls = new Set((existing || []).map((row) => row.url));

        // Build rows to insert, skipping duplicates
        const rowsToInsert = [];

        for (const bm of bookmarks) {
            const rawUrl = bm && typeof bm.url === 'string' ? bm.url.trim() : '';
            if (!rawUrl) continue;
            if (existingUrls.has(rawUrl)) {
                continue; // skip duplicates
            }

            const title =
                bm && typeof bm.title === 'string' && bm.title.trim()
                    ? bm.title.trim()
                    : rawUrl;

            let favicon = null;
            try {
                const hostname = new URL(rawUrl).hostname;
                favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
            } catch {
                favicon = null;
            }

            rowsToInsert.push({
                url: rawUrl,
                title,
                category: 'Imported Bookmarks',
                description: null,
                favicon,
                user_id: userId,
                created_at: new Date().toISOString(),
            });
        }

        if (!rowsToInsert.length) {
            res.status(200).json({
                success: true,
                inserted: 0,
                skippedAllAsDuplicates: true,
            });
            return;
        }

        const { error: insertError } = await supabase.from('websites').insert(rowsToInsert);

        if (insertError) {
            res.status(500).json({ error: `Supabase insert failed: ${insertError.message}` });
            return;
        }

        res.status(200).json({
            success: true,
            inserted: rowsToInsert.length,
            skipped: urls.length - rowsToInsert.length,
        });
    } catch (err) {
        console.error('import-bookmarks error:', err);
        res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
}


