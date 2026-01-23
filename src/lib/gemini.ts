import type { Website } from '../types';

export const searchWebsitesWithAI = async (query: string, websites: Website[]): Promise<Website[]> => {
  if (!query.trim()) {
    return websites;
  }

  if (websites.length === 0) {
    return [];
  }

  try {
    const websitesContext = websites.map(w => ({
      id: w.id,
      title: w.title,
      url: w.url,
      category: w.category,
      description: w.description || '',
    }));

    console.log(`[AI Search] Searching ${websites.length} websites with query: "${query}"`);

    // Prefer secure serverless endpoint first
    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, websites: websitesContext }),
      });

      if (res.ok) {
        const data: { ids?: string[]; error?: string } = await res.json();

        if (data.error) {
          console.error('[AI Search] Server error:', data.error);
          throw new Error(data.error);
        }

        if (Array.isArray(data.ids)) {
          const ordered = data.ids
            .map(id => websites.find(w => w.id === id))
            .filter(Boolean) as Website[];

          console.log(`[AI Search] Found ${ordered.length} results via server endpoint`);
          return ordered.length > 0 ? ordered : textSearch(query, websites);
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error('[AI Search] Server response error:', res.status, errorData);
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }
    } catch (serverError: any) {
      console.warn('[AI Search] Server endpoint failed, trying client-side fallback:', serverError.message);

      // If API route fails, try client-side key if present
      if (import.meta.env.VITE_GEMINI_API_KEY) {
        try {
          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

          if (!apiKey) {
            throw new Error('VITE_GEMINI_API_KEY is empty');
          }

          const genAI = new GoogleGenerativeAI(apiKey);
          // Try multiple model names in order of preference (updated for 2025/2026)
          // gemini-1.5-flash was retired in September 2025, using newer models
          // Note: We don't do test requests to conserve API quota (free tier: 5 req/min)
          const modelNames = ['gemini-2.0-flash', 'gemini-2.5-flash'];

          // Just use the first model directly without testing
          const selectedModelName = modelNames[0];
          console.log(`[AI Search] Using model: ${selectedModelName}`);
          const model = genAI.getGenerativeModel({ model: selectedModelName });

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

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          console.log('[AI Search] Client-side API response received');

          try {
            // Try to extract JSON from the response (might have markdown code blocks)
            let jsonText = text.trim();
            // Remove markdown code blocks if present
            if (jsonText.startsWith('```')) {
              jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
            }

            const ids = JSON.parse(jsonText.trim());
            if (Array.isArray(ids)) {
              const ordered = ids
                .map(id => websites.find(w => w.id === id))
                .filter(Boolean) as Website[];

              console.log(`[AI Search] Found ${ordered.length} results via client-side API`);
              if (ordered.length > 0) return ordered;
            }
          } catch (parseError) {
            console.error('[AI Search] Failed to parse AI response:', parseError);
            console.error('[AI Search] Raw response:', text);
            throw new Error('Failed to parse AI response');
          }
        } catch (clientError: any) {
          console.error('[AI Search] Client-side API failed:', clientError.message);

          // For rate limit errors, silently fall back to text search instead of showing error
          if (clientError.message?.includes('429')) {
            console.log('[AI Search] Rate limit exceeded, falling back to text search');
            return textSearch(query, websites);
          }

          // Provide more helpful error messages for other errors
          let errorMessage = 'Client-side AI search failed';
          if (clientError.message?.includes('API_KEY')) {
            errorMessage = 'Invalid or missing Gemini API key';
          } else if (clientError.message?.includes('404')) {
            errorMessage = 'Gemini model not found or not available';
          } else if (clientError.message?.includes('403')) {
            errorMessage = 'Gemini API access denied - check your API key permissions';
          }

          throw new Error(`${errorMessage}: ${clientError.message}`);
        }
      } else {
        // No client-side API key, just use text search silently
        console.log('[AI Search] No client-side API key, using text search');
        return textSearch(query, websites);
      }
    }

    // Fallback to text search
    console.log('[AI Search] Falling back to text search');
    return textSearch(query, websites);
  } catch (error: any) {
    // For rate limit errors anywhere, silently fall back to text search
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      console.log('[AI Search] Rate limit hit, using text search instead');
      return textSearch(query, websites);
    }
    console.error('[AI Search] All methods failed:', error);
    throw error; // Re-throw to let Dashboard handle it
  }
};

// Re-export smartSearch for fallback text search
// This provides fuzzy matching capabilities when AI search fails
import { smartSearch } from './smartSearch';

// Simple wrapper to maintain backward compatibility
const textSearch = (query: string, websites: Website[]): Website[] => {
  const result = smartSearch(query, websites);
  return result.websites;
};