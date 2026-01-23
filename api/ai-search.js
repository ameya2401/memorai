import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      console.error('[AI Search API] GEMINI_API_KEY not configured');
      res.status(500).json({ error: 'GEMINI_API_KEY not configured on server. Please set the environment variable.' });
      return;
    }

    const { query, websites } = req.body || {};

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'Query is required and must be a non-empty string' });
      return;
    }

    if (!Array.isArray(websites)) {
      res.status(400).json({ error: 'Websites must be an array' });
      return;
    }

    if (websites.length === 0) {
      res.status(200).json({ ids: [] });
      return;
    }

    console.log(`[AI Search API] Processing search for query: "${query}" with ${websites.length} websites`);

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try multiple model names in order of preference (updated for 2025/2026)
    // gemini-1.5-flash was retired in September 2025, using newer models
    // Note: We don't do test requests to conserve API quota (free tier: 5 req/min)
    const modelNames = ['gemini-2.0-flash', 'gemini-2.5-flash'];

    let model = null;
    let selectedModelName = modelNames[0];

    // Just initialize the first model without testing - we'll find out if it works on actual use
    console.log(`[AI Search API] Using model: ${selectedModelName}`);
    model = genAI.getGenerativeModel({ model: selectedModelName });


    const websitesContext = websites.map((w) => ({
      id: w.id,
      title: w.title,
      url: w.url,
      category: w.category,
      description: w.description || '',
    }));

    const prompt = `You are a STRICT search engine for a personal website bookmarks app. Given a user's search query and a list of their saved websites, return ONLY the IDs of websites that are GENUINELY relevant.

User Query: "${query}"

Saved Websites:
${JSON.stringify(websitesContext, null, 2)}

STRICT MATCHING RULES:
1. A website is relevant ONLY if:
   - The title, URL, or description contains keywords from the query, OR
   - The website's topic directly relates to the query's intent
2. DO NOT return websites just because they are "vaguely related" or "might be useful"
3. If the query asks about "resume", only return websites about resumes, CVs, job applications, career tips
4. If the query asks about "cooking", only return websites about cooking, recipes, food
5. Be VERY strict - it's better to return an empty array than to return irrelevant results
6. Maximum 10 results, ordered by relevance (best match first)

CRITICAL: If NO websites genuinely match the query, return an empty array: []
Do NOT guess or return random websites. Users prefer no results over wrong results.

Response format (JSON array of IDs only): ["id1", "id2"]`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('[AI Search API] Received response from Gemini API');

      let ids = [];
      try {
        // Try to extract JSON from the response (might have markdown code blocks)
        let jsonText = text.trim();
        // Remove markdown code blocks if present
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
        }

        const parsed = JSON.parse(jsonText.trim());
        if (Array.isArray(parsed)) {
          ids = parsed.filter((v) => typeof v === 'string');
          console.log(`[AI Search API] Parsed ${ids.length} website IDs from response`);
        } else {
          console.warn('[AI Search API] Response is not an array:', parsed);
        }
      } catch (parseError) {
        console.error('[AI Search API] Failed to parse response:', parseError);
        console.error('[AI Search API] Raw response:', text);
        res.status(500).json({ error: 'Failed to parse AI response', details: parseError.message });
        return;
      }

      res.status(200).json({ ids });
    } catch (geminiError) {
      console.error('[AI Search API] Gemini API error:', geminiError);

      // Provide more helpful error messages
      let errorMessage = 'Gemini API error';
      let details = geminiError?.message || 'Unknown error';

      if (details?.includes('API_KEY')) {
        errorMessage = 'Invalid or missing Gemini API key';
        details = 'Please check your GEMINI_API_KEY environment variable';
      } else if (details?.includes('404')) {
        errorMessage = 'Gemini model not found';
        details = 'The requested model may not be available. Try using a different model.';
      } else if (details?.includes('403')) {
        errorMessage = 'Gemini API access denied';
        details = 'Check your API key permissions and billing status';
      } else if (details?.includes('429')) {
        errorMessage = 'Gemini API rate limit exceeded';
        details = 'Too many requests. Please wait before trying again.';
      }

      res.status(500).json({ error: errorMessage, details });
    }
  } catch (error) {
    console.error('[AI Search API] Handler error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error?.message || 'Unknown error' });
  }
}


