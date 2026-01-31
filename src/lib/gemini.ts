import type { Website } from '../types';
import { smartSearch } from './smartSearch';

const MAX_AI_RESULTS = 8;
const PREFILTER_CANDIDATES = 60;  // Send more candidates for better semantic analysis
const DESCRIPTION_SNIPPET = 400;  // More context for AI to understand domain

const buildCandidates = (query: string, websites: Website[]): Website[] => {
  const trimmed = query.trim();
  if (!trimmed) return websites.slice(0, PREFILTER_CANDIDATES);

  const ranked = smartSearch(trimmed, websites).websites;
  if (ranked.length === 0) return websites.slice(0, PREFILTER_CANDIDATES);

  return ranked.slice(0, PREFILTER_CANDIDATES);
};

const makeContext = (candidates: Website[]) =>
  candidates.map(w => ({
    id: w.id,
    title: w.title,
    url: w.url,
    category: w.category,
    description: (w.description || '').slice(0, DESCRIPTION_SNIPPET),
  }));

function textSearch(query: string, websites: Website[]): Website[] {
  const result = smartSearch(query, websites);
  return result.websites;
}

const postProcess = (ids: string[] | undefined, websites: Website[], query: string): Website[] => {
  if (!Array.isArray(ids)) return textSearch(query, websites).slice(0, MAX_AI_RESULTS);

  const byId = new Map(websites.map(w => [w.id, w] as const));
  const seen = new Set<string>();
  const matched: Website[] = [];

  for (const id of ids) {
    if (typeof id !== 'string' || seen.has(id)) continue;
    const website = byId.get(id);
    if (website) {
      matched.push(website);
      seen.add(id);
      if (matched.length >= MAX_AI_RESULTS) break;
    }
  }

  if (matched.length === 0) {
    return textSearch(query, websites).slice(0, MAX_AI_RESULTS);
  }

  // Stabilize ordering by re-running local relevance scoring on the matched set
  return smartSearch(query, matched).websites.slice(0, MAX_AI_RESULTS);
};

export const searchWebsitesWithAI = async (query: string, websites: Website[]): Promise<Website[]> => {
  if (!query.trim()) {
    return websites;
  }

  if (websites.length === 0) {
    return [];
  }

  try {
    const candidates = buildCandidates(query, websites);
    const websitesContext = makeContext(candidates);

    console.log(`[AI Search] Searching ${websites.length} websites with query: "${query}" (candidates sent: ${websitesContext.length})`);

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
          const ordered = postProcess(data.ids, websites, query);
          console.log(`[AI Search] Found ${ordered.length} results via server endpoint`);
          return ordered;
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
          // Try multiple model names in order of preference
          const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash'];

          let model;
          for (const name of modelNames) {
            try {
              model = genAI.getGenerativeModel({ model: name });
              break;
            } catch (e) {
              // ignore
            }
          }
          if (!model) model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
- Maximum ${MAX_AI_RESULTS} results, best matches first
- Use ONLY IDs from the candidate list

Respond with JSON: {"ids": ["id1","id2"]}. No extra text.`;

          const result = await model.generateContent({
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

          console.log('[AI Search] Client-side API response received');

          try {
            // Try to extract JSON from the response (might have markdown code blocks)
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

            const parsed = JSON.parse(jsonText.trim());
            let ids = Array.isArray(parsed) ? parsed : parsed?.ids;

            // Fallback: extract from object values
            if (!Array.isArray(ids) && parsed && typeof parsed === 'object') {
              ids = Object.values(parsed).flat().filter(v => typeof v === 'string');
            }

            const ordered = postProcess(ids, websites, query);
            console.log(`[AI Search] Found ${ordered.length} results via client-side API`);
            if (ordered.length > 0) return ordered;
          } catch (parseError) {
            console.error('[AI Search] Failed to parse AI response:', parseError);
            console.error('[AI Search] Raw response:', text);

            // Last resort: try to extract UUIDs directly from text
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
            const uuidMatches = text.match(uuidRegex);
            if (uuidMatches && uuidMatches.length > 0) {
              const ids = [...new Set(uuidMatches)].slice(0, MAX_AI_RESULTS);
              console.log(`[AI Search] Extracted ${ids.length} UUIDs directly from text`);
              const ordered = postProcess(ids, websites, query);
              if (ordered.length > 0) return ordered;
            }

            // Fall back to text search instead of throwing
            console.log('[AI Search] Parse failed, using text search fallback');
            return textSearch(query, websites).slice(0, MAX_AI_RESULTS);
          }
        } catch (clientError: any) {
          console.error('[AI Search] Client-side API failed:', clientError.message);

          // For rate limit errors, silently fall back to text search instead of showing error
          if (clientError.message?.includes('429')) {
            console.log('[AI Search] Rate limit exceeded, falling back to text search');
            return textSearch(query, websites).slice(0, MAX_AI_RESULTS);
          }
          throw clientError;
        }
      } else {
        console.log('[AI Search] No client-side API key, using text search');
        return textSearch(query, websites).slice(0, MAX_AI_RESULTS);
      }
    }

    // Fallback to text search
    console.log('[AI Search] Falling back to text search');
    return textSearch(query, websites).slice(0, MAX_AI_RESULTS);
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      return textSearch(query, websites).slice(0, MAX_AI_RESULTS);
    }
    console.error('[AI Search] All methods failed:', error);
    throw error;
  }
};