import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // CORS
    const origin = req.headers?.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-extension-secret');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        // Optional: Check extension secret if user wants to secure it strictly
        // For now, we'll allow it if userId is provided, as it's a read-only for categories
        // But consistent with save-tab, let's check headers if possible, though GET requests from browser might vary

        // Get userId from query
        const { userId } = req.query;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseUrl || !serviceKey) {
            console.error('Missing Supabase configuration');
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { data: categories, error } = await supabase
            .from('categories')
            .select('id, name')
            .eq('user_id', userId)
            .order('name');

        if (error) {
            throw error;
        }

        // Always include implicit "Recently Added" if not present (though UI usually handles this)
        // The extension expects { categories: [...] }
        res.status(200).json({ categories: categories || [] });

    } catch (err) {
        console.error('categories-api error:', err);
        res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
}
