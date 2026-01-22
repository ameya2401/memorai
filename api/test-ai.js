export default async function handler(req, res) {
    try {
        if (req.method !== 'GET') {
            res.status(405).json({ error: 'Method Not Allowed' });
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
            res.status(500).json({
                error: 'GEMINI_API_KEY not configured',
                status: 'error',
                message: 'Please set the GEMINI_API_KEY environment variable',
                solution: 'Create a .env file with: GEMINI_API_KEY=your-api-key-here'
            });
            return;
        }

        console.log('[AI Test] Testing Gemini API connection...');

        // First, test the API key with a simple REST call
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();

            if (!response.ok) {
                console.error('[AI Test] API key validation failed:', data);
                res.status(500).json({
                    status: 'error',
                    apiKeyConfigured: true,
                    error: 'API key validation failed',
                    details: data.error?.message || `HTTP ${response.status}`,
                    solution: 'Check that your API key is valid and has Generative AI API enabled'
                });
                return;
            }

            const availableModels = data.models?.map(m => m.name) || [];
            console.log('[AI Test] Available models from API:', availableModels);

            // Test our preferred models (updated for 2025/2026)
            const testModels = ['gemini-2.0-flash', 'gemini-2.5-flash'];
            const workingModels = [];

            for (const modelName of testModels) {
                try {
                    console.log(`[AI Test] Testing ${modelName}...`);

                    // Test with REST API directly
                    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: 'Say "Hello"' }] }]
                        })
                    });

                    if (testResponse.ok) {
                        const result = await testResponse.json();
                        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
                        workingModels.push({
                            name: modelName,
                            status: 'working',
                            testResponse: text.substring(0, 50) + '...'
                        });
                        console.log(`[AI Test] ✓ ${modelName} is working`);
                    } else {
                        const errorData = await testResponse.json().catch(() => ({ error: 'Unknown error' }));
                        throw new Error(errorData.error?.message || `HTTP ${testResponse.status}`);
                    }
                } catch (modelError) {
                    console.warn(`[AI Test] ✗ ${modelName} failed:`, modelError.message);
                    workingModels.push({
                        name: modelName,
                        status: 'failed',
                        error: modelError.message
                    });
                }
            }

            res.status(200).json({
                status: 'success',
                apiKeyConfigured: true,
                availableModels: availableModels,
                testedModels: workingModels,
                recommendedModel: workingModels.find(m => m.status === 'working')?.name || null,
                sdkVersion: 'Testing with REST API directly'
            });

        } catch (apiError) {
            console.error('[AI Test] API test failed:', apiError);
            res.status(500).json({
                status: 'error',
                apiKeyConfigured: true,
                error: 'API connection failed',
                details: apiError.message,
                solution: 'Make sure Generative AI API is enabled in your Google Cloud project'
            });
        }

    } catch (error) {
        console.error('[AI Test] Handler error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Internal Server Error',
            details: error?.message || 'Unknown error'
        });
    }
}
