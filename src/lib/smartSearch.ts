/**
 * Smart Search Engine for Memorai
 * 
 * Features:
 * - Fuzzy matching with Levenshtein distance
 * - Typo tolerance
 * - Spelling suggestions ("Did you mean...")
 * - Enhanced relevance ranking
 * - Real-time search support
 * - Substring and partial word matching
 * - Acronym detection
 * - Word stemming (basic)
 * - Multi-term AND/OR logic
 */

import type { Website } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SmartSearchResult {
    websites: Website[];
    suggestion: string | null;  // "Did you mean: react"
    query: string;
    totalMatches: number;
}

interface ScoredWebsite {
    website: Website;
    score: number;
    matchedTerms: string[];
    matchedFields: string[];
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
 * Extract all substrings of length >= minLen for aggressive matching
 */
function extractSubstrings(text: string, minLen: number = 3): string[] {
    const normalized = text.toLowerCase().replace(/[^\w]/g, '');
    const substrings: string[] = [];
    for (let i = 0; i <= normalized.length - minLen; i++) {
        for (let len = minLen; len <= Math.min(normalized.length - i, 12); len++) {
            substrings.push(normalized.slice(i, i + len));
        }
    }
    return substrings;
}

/**
 * Simple word stemmer - removes common suffixes
 */
function stemWord(word: string): string {
    const w = word.toLowerCase();
    // Common English suffixes
    const suffixes = ['ing', 'ed', 'es', 's', 'tion', 'ment', 'ness', 'able', 'ible', 'ful', 'less', 'ly', 'er', 'or', 'ist', 'ism'];
    for (const suffix of suffixes) {
        if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
            return w.slice(0, -suffix.length);
        }
    }
    return w;
}

/**
 * Generate acronym from text (e.g., "Visual Studio Code" -> "vsc")
 */
function generateAcronym(text: string): string {
    return extractWords(text)
        .map(w => w[0])
        .join('')
        .toLowerCase();
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
 * Scoring weights for different match types - tuned for best results
 */
const SCORE_WEIGHTS = {
    // Title matches (highest priority)
    EXACT_TITLE_FULL: 1000,     // Full query matches title exactly
    EXACT_TITLE_WORD: 500,      // Query term is exact word in title
    WORD_BOUNDARY_TITLE: 400,   // Term at word boundary in title
    PREFIX_TITLE: 300,          // Title word starts with query
    FUZZY_TITLE: 150,           // Fuzzy match in title

    // Description matches
    EXACT_DESCRIPTION_WORD: 200, // Exact word match in description
    WORD_BOUNDARY_DESC: 150,     // Term at word boundary in description
    FUZZY_DESCRIPTION: 80,       // Fuzzy match in description

    // URL matches (good signal for domain/path)
    EXACT_URL_PART: 250,        // Exact match in URL part
    URL_CONTAINS: 100,          // URL contains term

    // Category matches
    EXACT_CATEGORY: 400,        // Exact category match
    CATEGORY_CONTAINS: 200,     // Category contains term

    // Special matches
    ACRONYM_MATCH: 350,         // Acronym match (e.g., "ai" -> "Artificial Intelligence")
    ALL_TERMS_MATCH: 200,       // Bonus when ALL query terms match

    // Boosts
    PINNED_BOOST: 50,           // Pinned items get boost
};

// Minimum score threshold to be considered a match
const MIN_SCORE_THRESHOLD = 150;

/**
 * Check if term appears as a word (not just substring)
 * Returns true if term is at word boundary
 */
function isWordMatch(term: string, text: string): boolean {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
    return regex.test(text);
}

/**
 * Check if term appears at start of any word
 */
function isWordStartMatch(term: string, text: string): boolean {
    const regex = new RegExp(`\\b${escapeRegex(term)}`, 'i');
    return regex.test(text);
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if query matches as acronym
 */
function matchesAcronym(query: string, text: string): boolean {
    const acronym = generateAcronym(text);
    const q = query.toLowerCase().replace(/[^\w]/g, '');
    return acronym.length >= 2 && (acronym === q || acronym.startsWith(q));
}

/**
 * Calculate a score for how well a website matches the search query
 * STRICT matching - only returns high scores for relevant matches
 */
function calculateScore(query: string, website: Website): ScoredWebsite {
    const queryLower = query.toLowerCase().trim();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length >= 2);

    let score = 0;
    const matchedTerms: string[] = [];
    const matchedFields: string[] = [];
    let termsMatched = 0;

    // Prepare website fields
    const title = website.title || '';
    const titleLower = title.toLowerCase();
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 1);

    const description = website.description || '';
    const descriptionLower = description.toLowerCase();

    const category = website.category || '';
    const categoryLower = category.toLowerCase();

    const url = (website.url || '').toLowerCase().replace(/https?:\/\/(www\.)?/g, '');
    const urlParts = url.split(/[\/\.\-_?&#=]/).filter(p => p.length > 1);

    // === FULL QUERY MATCHING ===

    // Exact full query as word in title (highest priority)
    if (isWordMatch(queryLower, titleLower)) {
        score += SCORE_WEIGHTS.EXACT_TITLE_FULL;
        matchedFields.push('title-exact-word');
        matchedTerms.push(queryLower);
    }
    // Full query at word start in title
    else if (isWordStartMatch(queryLower, titleLower)) {
        score += SCORE_WEIGHTS.WORD_BOUNDARY_TITLE;
        matchedFields.push('title-word-start');
        matchedTerms.push(queryLower);
    }

    // Full query in description as word
    if (isWordMatch(queryLower, descriptionLower)) {
        score += SCORE_WEIGHTS.EXACT_DESCRIPTION_WORD;
        matchedFields.push('description-exact-word');
    }

    // Full query in category
    if (categoryLower === queryLower || isWordMatch(queryLower, categoryLower)) {
        score += SCORE_WEIGHTS.EXACT_CATEGORY;
        matchedFields.push('category-exact');
        matchedTerms.push(queryLower);
    } else if (categoryLower.includes(queryLower)) {
        score += SCORE_WEIGHTS.CATEGORY_CONTAINS;
        matchedFields.push('category-contains');
    }

    // URL part exact match (domain, path segment)
    if (urlParts.some(p => p === queryLower)) {
        score += SCORE_WEIGHTS.EXACT_URL_PART;
        matchedFields.push('url-exact-part');
        matchedTerms.push(queryLower);
    } else if (urlParts.some(p => p.startsWith(queryLower) && queryLower.length >= 3)) {
        score += SCORE_WEIGHTS.URL_CONTAINS;
        matchedFields.push('url-starts');
    }

    // Acronym matching (e.g., "ai" matches "Artificial Intelligence")
    if (queryLower.length >= 2 && queryLower.length <= 4) {
        if (matchesAcronym(queryLower, title)) {
            score += SCORE_WEIGHTS.ACRONYM_MATCH;
            matchedTerms.push(queryLower + '(acronym)');
            matchedFields.push('title-acronym');
        }
    }

    // === PER-TERM MATCHING (for multi-word queries) ===
    if (queryTerms.length > 0) {
        for (const term of queryTerms) {
            let termMatched = false;

            // Title - exact word
            if (titleWords.includes(term)) {
                score += SCORE_WEIGHTS.EXACT_TITLE_WORD;
                termMatched = true;
                if (!matchedTerms.includes(term)) matchedTerms.push(term);
                matchedFields.push('title-word');
            }
            // Title - word starts with term
            else if (titleWords.some(w => w.startsWith(term))) {
                score += SCORE_WEIGHTS.PREFIX_TITLE;
                termMatched = true;
                if (!matchedTerms.includes(term)) matchedTerms.push(term);
                matchedFields.push('title-prefix');
            }
            // Title - fuzzy match (for typos)
            else if (term.length >= 4) {
                for (const titleWord of titleWords) {
                    if (titleWord.length >= 4 && isFuzzyMatch(term, titleWord, 0.75)) {
                        score += SCORE_WEIGHTS.FUZZY_TITLE;
                        termMatched = true;
                        if (!matchedTerms.includes(titleWord)) matchedTerms.push(titleWord);
                        matchedFields.push('title-fuzzy');
                        break;
                    }
                }
            }

            // Description - word boundary match
            if (isWordMatch(term, descriptionLower)) {
                score += SCORE_WEIGHTS.WORD_BOUNDARY_DESC;
                termMatched = true;
                matchedFields.push('desc-word');
            }

            // URL - term in URL parts
            if (urlParts.some(p => p === term || p.startsWith(term))) {
                score += SCORE_WEIGHTS.URL_CONTAINS;
                termMatched = true;
                matchedFields.push('url-term');
            }

            if (termMatched) termsMatched++;
        }

        // Bonus if ALL query terms matched somewhere
        if (queryTerms.length > 1 && termsMatched === queryTerms.length) {
            score += SCORE_WEIGHTS.ALL_TERMS_MATCH;
        }
    }

    // Pinned boost
    if (website.is_pinned && score > 0) {
        score += SCORE_WEIGHTS.PINNED_BOOST;
    }

    return { website, score, matchedTerms, matchedFields };
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
            query: '',
            totalMatches: websites.length
        };
    }

    const queryLower = trimmedQuery.toLowerCase();

    // Calculate scores for all websites - STRICT filtering
    let scoredWebsites: ScoredWebsite[] = websites
        .map(website => calculateScore(trimmedQuery, website))
        .filter(sw => sw.score >= MIN_SCORE_THRESHOLD)  // Only include websites above threshold
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
        query: trimmedQuery,
        totalMatches: scoredWebsites.length
    };
}

/**
 * Quick search for real-time filtering (simpler, faster)
 * Used during typing before debounce triggers full search
 */
export function quickSearch(query: string, websites: Website[]): Website[] {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) return websites;

    // For single characters, match word starts
    if (trimmedQuery.length === 1) {
        return websites.filter(website => {
            const words = extractWords([
                website.title || '',
                website.description || '',
                website.category || ''
            ].join(' '));
            return words.some(w => w.startsWith(trimmedQuery));
        });
    }

    // More comprehensive matching for quick search
    return websites.filter(website => {
        const title = (website.title || '').toLowerCase();
        const description = (website.description || '').toLowerCase();
        const category = (website.category || '').toLowerCase();
        const url = (website.url || '').toLowerCase();

        const searchable = `${title} ${description} ${category} ${url}`;

        // Direct substring match
        if (searchable.includes(trimmedQuery)) return true;

        // Check if any word starts with query
        const words = searchable.split(/[\s\-_\/\.]+/);
        if (words.some(word => word.startsWith(trimmedQuery))) return true;

        // Check acronym match for short queries
        if (trimmedQuery.length <= 4) {
            const acronym = generateAcronym(website.title || '');
            if (acronym.startsWith(trimmedQuery)) return true;
        }

        return false;
    });
}

// Export for testing
export { levenshteinDistance, stringSimilarity, isFuzzyMatch, phoneticHash, stemWord, generateAcronym };
