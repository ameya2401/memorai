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
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Missing email or password' });
            return;
        }

        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''; // Use Anon key for client-side like auth

        // For signInWithPassword, we can use the public anon key.
        // However, if we want to bypass RLS or do admin stuff, we need service role.
        // Here we just want to verify credentials.

        if (!supabaseUrl || !serviceKey) {
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            res.status(401).json({ error: error.message });
            return;
        }

        if (!data.user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        // Return specific user info needed by extension
        res.status(200).json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email
            }
        });

    } catch (err) {
        console.error('auth-user error:', err);
        res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
}
