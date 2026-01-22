/**
 * Smart Search Engine for Memorai
 * 
 * Features:
 * - Fuzzy matching with Levenshtein distance
 * - Typo tolerance
 * - Spelling suggestions ("Did you mean...")
 * - Enhanced relevance ranking
 * - Real-time search support
 */

import type { Website } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SmartSearchResult {
    websites: Website[];
    suggestion: string | null;  // "Did you mean: react"
    query: string;
}

interface ScoredWebsite {
    website: Website;
    score: number;
    matchedTerms: string[];
}

// ============================================================================
// Levenshtein Distance Algorithm
// ============================================================================

/**
 * Calculate the Levenshtein (edit) distance between two strings.
 * Uses dynamic programming with early termination for performance.
 * 
 * @param a First string
 * @param b Second string
 * @param maxDistance Maximum distance to compute (early termination optimization)
 * @returns Edit distance, or Infinity if > maxDistance
 */
function levenshteinDistance(a: string, b: string, maxDistance: number = 3): number {
    // Quick checks
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // If length difference exceeds maxDistance, return early
    if (Math.abs(a.length - b.length) > maxDistance) return Infinity;

    // Ensure a is the shorter string for memory efficiency
    if (a.length > b.length) {
        [a, b] = [b, a];
    }

    const aLen = a.length;
    const bLen = b.length;

    // Use single row for space optimization
    let prevRow: number[] = Array.from({ length: aLen + 1 }, (_, i) => i);
    let currRow: number[] = new Array(aLen + 1);

    for (let j = 1; j <= bLen; j++) {
        currRow[0] = j;
        let minInRow = j;

        for (let i = 1; i <= aLen; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            currRow[i] = Math.min(
                prevRow[i] + 1,      // deletion
                currRow[i - 1] + 1,  // insertion
                prevRow[i - 1] + cost // substitution
            );
            minInRow = Math.min(minInRow, currRow[i]);
        }

        // Early termination: if minimum in row exceeds maxDistance
        if (minInRow > maxDistance) return Infinity;

        // Swap rows
        [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[aLen] <= maxDistance ? prevRow[aLen] : Infinity;
}

/**
 * Calculate similarity score between two strings (0.0 to 1.0)
 */
function stringSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const maxLen = Math.max(a.length, b.length);
    const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase(), maxLen);

    if (distance === Infinity) return 0.0;
    return 1.0 - (distance / maxLen);
}

/**
 * Check if two strings are a fuzzy match based on similarity threshold
 */
function isFuzzyMatch(query: string, target: string, threshold: number = 0.7): boolean {
    return stringSimilarity(query, target) >= threshold;
}

// ============================================================================
// Text Processing Utilities
// ============================================================================

/**
 * Normalize text for comparison: lowercase, remove special characters
 */
function normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extract words from text
 */
function extractWords(text: string): string[] {
    return normalizeText(text).split(' ').filter(w => w.length > 1);
}

/**
 * Generate n-grams from a word for partial matching
 */
function generateNgrams(word: string, n: number = 2): string[] {
    if (word.length < n) return [word];
    const ngrams: string[] = [];
    for (let i = 0; i <= word.length - n; i++) {
        ngrams.push(word.slice(i, i + n));
    }
    return ngrams;
}

/**
 * Simple phonetic hash (Soundex-like) for matching words that sound similar
 */
function phoneticHash(word: string): string {
    if (!word) return '';

    const w = word.toLowerCase();
    let result = w[0];

    const map: Record<string, string> = {
        'b': '1', 'f': '1', 'p': '1', 'v': '1',
        'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
        'd': '3', 't': '3',
        'l': '4',
        'm': '5', 'n': '5',
        'r': '6'
    };

    let prev = map[w[0]] || '0';

    for (let i = 1; i < w.length && result.length < 4; i++) {
        const code = map[w[i]] || '0';
        if (code !== '0' && code !== prev) {
            result += code;
        }
        prev = code;
    }

    return result.padEnd(4, '0');
}

// ============================================================================
// Vocabulary & Spelling Suggestions
// ============================================================================

/**
 * Build a vocabulary set from all website content
 */
export function buildVocabulary(websites: Website[]): Set<string> {
    const vocabulary = new Set<string>();

    for (const website of websites) {
        // Extract words from all searchable fields
        const fields = [
            website.title || '',
            website.description || '',
            website.category || '',
            website.url || ''
        ];

        for (const field of fields) {
            const words = extractWords(field);
            words.forEach(word => {
                if (word.length >= 3) {  // Only include words with 3+ characters
                    vocabulary.add(word);
                }
            });
        }
    }

    return vocabulary;
}

/**
 * Find the best spelling correction for a word
 */
function findBestMatch(word: string, vocabulary: Set<string>): string | null {
    if (vocabulary.has(word)) return null;  // Word is correct

    let bestMatch: string | null = null;
    let bestSimilarity = 0.6;  // Minimum threshold for suggestions

    const wordPhonetic = phoneticHash(word);

    for (const vocabWord of vocabulary) {
        // Skip if lengths are too different
        if (Math.abs(word.length - vocabWord.length) > 2) continue;

        // Check phonetic match first (fast)
        const vocabPhonetic = phoneticHash(vocabWord);
        const phoneticMatch = wordPhonetic === vocabPhonetic;

        // Calculate similarity
        const similarity = stringSimilarity(word, vocabWord);

        // Boost score if phonetically similar
        const adjustedSimilarity = phoneticMatch ? similarity + 0.1 : similarity;

        if (adjustedSimilarity > bestSimilarity) {
            bestSimilarity = adjustedSimilarity;
            bestMatch = vocabWord;
        }
    }

    return bestMatch;
}

/**
 * Get spelling suggestion for a query
 */
export function getSuggestion(query: string, vocabulary: Set<string>): string | null {
    const words = extractWords(query);
    if (words.length === 0) return null;

    let hasCorrection = false;
    const correctedWords: string[] = [];

    for (const word of words) {
        const correction = findBestMatch(word, vocabulary);
        if (correction) {
            correctedWords.push(correction);
            hasCorrection = true;
        } else {
            correctedWords.push(word);
        }
    }

    return hasCorrection ? correctedWords.join(' ') : null;
}

// ============================================================================
// Scoring System
// ============================================================================

/**
 * Scoring weights for different match types
 */
const SCORE_WEIGHTS = {
    EXACT_TITLE: 200,
    FUZZY_TITLE: 150,
    PREFIX_TITLE: 120,
    EXACT_DESCRIPTION: 80,
    FUZZY_DESCRIPTION: 60,
    URL_MATCH: 50,
    CATEGORY_MATCH: 40,
    ANY_FIELD_FUZZY: 30,
    RECENCY_BOOST_MAX: 10,
};

/**
 * Calculate a score for how well a website matches the search query
 */
function calculateScore(query: string, website: Website): ScoredWebsite {
    const queryTerms = extractWords(query);
    const queryNormalized = normalizeText(query);

    let score = 0;
    const matchedTerms: string[] = [];

    // Prepare website fields
    const title = normalizeText(website.title || '');
    const titleWords = extractWords(website.title || '');
    const description = normalizeText(website.description || '');
    const descriptionWords = extractWords(website.description || '');
    const category = normalizeText(website.category || '');
    const url = normalizeText(website.url || '').replace(/https?:\/\//g, '');

    // Check each query term
    for (const term of queryTerms) {
        // === Title Matching ===
        // Exact match in title
        if (title.includes(term)) {
            score += SCORE_WEIGHTS.EXACT_TITLE;
            matchedTerms.push(term);
        } else {
            // Fuzzy match with title words
            for (const titleWord of titleWords) {
                if (isFuzzyMatch(term, titleWord, 0.75)) {
                    score += SCORE_WEIGHTS.FUZZY_TITLE;
                    matchedTerms.push(titleWord);
                    break;
                }
                // Prefix match (title word starts with query term)
                if (titleWord.startsWith(term)) {
                    score += SCORE_WEIGHTS.PREFIX_TITLE;
                    matchedTerms.push(titleWord);
                    break;
                }
            }
        }

        // === Description Matching ===
        if (description.includes(term)) {
            score += SCORE_WEIGHTS.EXACT_DESCRIPTION;
            if (!matchedTerms.includes(term)) matchedTerms.push(term);
        } else {
            for (const descWord of descriptionWords) {
                if (isFuzzyMatch(term, descWord, 0.75)) {
                    score += SCORE_WEIGHTS.FUZZY_DESCRIPTION;
                    if (!matchedTerms.includes(descWord)) matchedTerms.push(descWord);
                    break;
                }
            }
        }

        // === URL Matching ===
        if (url.includes(term)) {
            score += SCORE_WEIGHTS.URL_MATCH;
            if (!matchedTerms.includes(term)) matchedTerms.push(term);
        }

        // === Category Matching ===
        if (category.includes(term) || isFuzzyMatch(term, category, 0.7)) {
            score += SCORE_WEIGHTS.CATEGORY_MATCH;
            if (!matchedTerms.includes(term)) matchedTerms.push(term);
        }
    }

    // Full phrase matching bonus
    if (title.includes(queryNormalized)) {
        score += 50; // Extra bonus for full phrase in title
    }
    if (description.includes(queryNormalized)) {
        score += 25; // Extra bonus for full phrase in description
    }

    // N-gram matching for very short queries (2-3 chars)
    if (query.length <= 3 && query.length >= 2) {
        const queryNgrams = generateNgrams(query.toLowerCase(), 2);
        const allFieldsText = `${title} ${description} ${url}`;
        const allNgrams = generateNgrams(allFieldsText, 2);

        for (const qNgram of queryNgrams) {
            if (allNgrams.includes(qNgram)) {
                score += 10;
                break;
            }
        }
    }

    // Recency boost (newer entries get slight boost)
    if (website.created_at) {
        const ageInDays = (Date.now() - new Date(website.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0, SCORE_WEIGHTS.RECENCY_BOOST_MAX - Math.floor(ageInDays / 30));
        score += recencyBoost;
    }

    return { website, score, matchedTerms };
}

// ============================================================================
// Main Search Function
// ============================================================================

/**
 * Perform intelligent search on websites
 * 
 * @param query Search query string
 * @param websites Array of websites to search
 * @param vocabulary Optional pre-built vocabulary for spelling suggestions
 * @returns Search results with websites, suggestion, and match info
 */
export function smartSearch(
    query: string,
    websites: Website[],
    vocabulary?: Set<string>
): SmartSearchResult {
    const trimmedQuery = query.trim();

    // Empty query returns all websites
    if (!trimmedQuery) {
        return {
            websites,
            suggestion: null,
            query: ''
        };
    }

    // Calculate scores for all websites
    const scoredWebsites: ScoredWebsite[] = websites
        .map(website => calculateScore(trimmedQuery, website))
        .filter(sw => sw.score > 0)  // Only include websites with positive scores
        .sort((a, b) => b.score - a.score);  // Sort by score descending

    // Get spelling suggestion if vocabulary is provided and few/no results
    let suggestion: string | null = null;
    if (vocabulary && scoredWebsites.length < 3) {
        suggestion = getSuggestion(trimmedQuery, vocabulary);
        // Don't suggest if it's the same as the query
        if (suggestion && normalizeText(suggestion) === normalizeText(trimmedQuery)) {
            suggestion = null;
        }
    }

    return {
        websites: scoredWebsites.map(sw => sw.website),
        suggestion,
        query: trimmedQuery
    };
}

/**
 * Quick search for real-time filtering (simpler, faster)
 * Used during typing before debounce triggers full search
 */
export function quickSearch(query: string, websites: Website[]): Website[] {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) return websites;

    // Simple prefix and contains matching for speed
    return websites.filter(website => {
        const searchable = [
            website.title || '',
            website.description || '',
            website.category || '',
            website.url || ''
        ].join(' ').toLowerCase();

        // Check if any word starts with query
        const words = searchable.split(/\s+/);
        const hasPrefix = words.some(word => word.startsWith(trimmedQuery));

        // Check if searchable contains query
        const hasMatch = searchable.includes(trimmedQuery);

        return hasPrefix || hasMatch;
    });
}

// Export for testing
export { levenshteinDistance, stringSimilarity, isFuzzyMatch, phoneticHash };
