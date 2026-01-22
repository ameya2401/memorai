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

    const prompt = `Given this list of saved websites and a user search query, return ONLY the IDs of the most relevant websites in order of relevance as a JSON array.\n\nUser Query: "${query}"\n\nWebsites:\n${JSON.stringify(websitesContext, null, 2)}\n\nInstructions:\n- Return only the IDs of relevant websites as a JSON array\n- Order by relevance (most relevant first)\n- Consider title, URL, category, and description\n- If no websites match, return an empty array\n- Return only valid IDs from the provided list\n\nResponse format: ["id1", "id2", "id3"]`;

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


