import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_RESULTS = 8;
const PREFILTER_CANDIDATES = 80;  // More candidates for better semantic analysis
const DESCRIPTION_SNIPPET = 400;  // More context for AI to understand domain/purpose

const scoreWebsite = (queryLower, website) => {
  const { title = '', description = '', url = '', category = '' } = website;
  const text = `${title} ${description} ${url} ${category}`.toLowerCase();

  let score = 0;
  if (text.includes(queryLower)) score += 5;
  for (const term of queryLower.split(/\s+/).filter(Boolean)) {
    if (title.toLowerCase().includes(term)) score += 4;
    if (description.toLowerCase().includes(term)) score += 3;
    if (url.toLowerCase().includes(term)) score += 2;
    if (category.toLowerCase().includes(term)) score += 1;
  }
  return score;
};

const prefilterWebsites = (query, websites) => {
  if (!query.trim()) return websites.slice(0, PREFILTER_CANDIDATES);

  const q = query.toLowerCase();
  const scored = websites
    .map(w => ({ website: w, score: scoreWebsite(q, w) }))
    .sort((a, b) => b.score - a.score || 0);

  return scored.length > 0
    ? scored.slice(0, PREFILTER_CANDIDATES).map(s => s.website)
    : websites.slice(0, PREFILTER_CANDIDATES);
};

const sanitizeContext = (websites) =>
  websites.map((w) => ({
    id: w.id,
    title: w.title,
    url: w.url,
    category: w.category,
    description: (w.description || '').slice(0, DESCRIPTION_SNIPPET),
  }));

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

    const candidates = prefilterWebsites(query, websites);
    const websitesContext = sanitizeContext(candidates);

    console.log(`[AI Search API] Processing search for query: "${query}" with ${websites.length} websites (candidates sent: ${websitesContext.length})`);

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try multiple model names in order of preference (updated for 2026)
    const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    let selectedModelName = modelNames[0];

    const prompt = `You are a SEMANTIC search engine for a bookmarks app. Your job is to understand what each website ACTUALLY IS (its purpose/domain) and match it to the user's search intent.

User Query: "${query}"

Candidate Websites:
${JSON.stringify(websitesContext, null, 2)}

INSTRUCTIONS:
1) First, understand what the user is ACTUALLY looking for. "${query}" means they want: [analyze the intent]
2) For EACH website, determine its PRIMARY PURPOSE/DOMAIN:
   - What does this website/tool actually DO?
   - What problem does it solve?
   - What category/industry does it belong to?
3) ONLY return websites whose PRIMARY PURPOSE matches the search intent.
4) DO NOT match just because keywords appear - the website must BE what the user is searching for.

EXAMPLES:
- Query "ai website maker" → Match: Wix AI, Framer, Webflow (tools that use AI to build websites)
- Query "ai website maker" → DO NOT match: Article about AI, Random site with "website" in description
- Query "react tutorials" → Match: React docs, Codecademy React course
- Query "react tutorials" → DO NOT match: Blog post mentioning React once

RULES:
- Return [] if no website's PRIMARY PURPOSE matches the query intent
- Maximum ${MAX_RESULTS} results, best matches first
- Use ONLY IDs from the candidate list

Respond with JSON: {"ids": ["id1","id2"]}. No extra text.`;

    let lastError = null;
    for (const name of modelNames) {
      try {
        const attemptModel = genAI.getGenerativeModel({ model: name });
        selectedModelName = name;

        const result = await attemptModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 256,
          },
        });
        const response = await result.response;
        const text = response.text();

        console.log(`[AI Search API] Received response from Gemini API (${selectedModelName})`);

        let ids = [];
        try {
          let jsonText = text.trim();

          // Remove markdown code blocks if present
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
          }

          // Try to extract JSON object/array from the text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }

          // Clean up common issues
          jsonText = jsonText.trim();

          const parsed = JSON.parse(jsonText);
          const rawIds = Array.isArray(parsed) ? parsed : parsed?.ids;
          if (Array.isArray(rawIds)) {
            const idSet = new Set();
            for (const id of rawIds) {
              if (typeof id !== 'string') continue;
              if (idSet.has(id)) continue;
              idSet.add(id);
              ids.push(id);
              if (ids.length >= MAX_RESULTS) break;
            }
            console.log(`[AI Search API] Parsed ${ids.length} website IDs from response`);
          } else {
            console.warn('[AI Search API] Response did not contain an ids array, parsed:', parsed);
            // If it's an object with different structure, try to find ids
            if (parsed && typeof parsed === 'object') {
              const possibleIds = Object.values(parsed).flat().filter(v => typeof v === 'string');
              if (possibleIds.length > 0) {
                ids = possibleIds.slice(0, MAX_RESULTS);
                console.log(`[AI Search API] Extracted ${ids.length} IDs from object values`);
              }
            }
          }
        } catch (parseError) {
          console.error('[AI Search API] Failed to parse response:', parseError.message);
          console.error('[AI Search API] Raw response:', text);

          // Last resort: try to extract UUIDs directly from text
          const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
          const uuidMatches = text.match(uuidRegex);
          if (uuidMatches && uuidMatches.length > 0) {
            ids = [...new Set(uuidMatches)].slice(0, MAX_RESULTS);
            console.log(`[AI Search API] Extracted ${ids.length} UUIDs directly from text`);
          } else {
            lastError = parseError;
            continue;
          }
        }

        // Keep only IDs that exist in candidates and respect MAX_RESULTS
        const candidateIds = new Set(candidates.map(w => w.id));
        const filteredIds = ids.filter(id => candidateIds.has(id)).slice(0, MAX_RESULTS);

        res.status(200).json({ ids: filteredIds });
        return;
      } catch (geminiError) {
        console.warn(`[AI Search API] Gemini model ${name} failed:`, geminiError?.message || geminiError);
        lastError = geminiError;
      }
    }

    // If we reach here, all models failed
    console.error('[AI Search API] All Gemini model attempts failed:', lastError);
    let errorMessage = 'Gemini API error';
    let details = lastError?.message || 'Unknown error';

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
  } catch (error) {
    console.error('[AI Search API] Handler error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error?.message || 'Unknown error' });
  }
}


