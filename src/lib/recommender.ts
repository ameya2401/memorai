import type { Website } from '../types';

/**
 * Zero-cost content-based recommender system for finding related websites.
 * Uses multiple signals to compute similarity scores without any external API calls.
 */

// Extract domain from URL
const getDomain = (url: string): string => {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return '';
    }
};

// Tokenize text into meaningful words
const tokenize = (text: string): Set<string> => {
    if (!text) return new Set();
    return new Set(
        text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2) // Ignore very short words
    );
};

// Calculate Jaccard similarity between two sets
const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
    if (setA.size === 0 && setB.size === 0) return 0;

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
};

interface ScoredWebsite {
    website: Website;
    score: number;
    reasons: string[];
}

/**
 * Find related websites based on content similarity.
 * 
 * Scoring algorithm:
 * - Same category: +5 points
 * - Title word overlap: +0-4 points (based on Jaccard similarity)
 * - Same domain: +3 points
 * - Description overlap: +0-3 points (based on Jaccard similarity)
 * 
 * @param currentWebsite The website to find related items for
 * @param allWebsites All available websites to compare against
 * @param limit Maximum number of related websites to return (default: 4)
 * @returns Array of related websites sorted by relevance
 */
export const findRelatedWebsites = (
    currentWebsite: Website,
    allWebsites: Website[],
    limit: number = 4
): Website[] => {
    const currentDomain = getDomain(currentWebsite.url);
    const currentTitleTokens = tokenize(currentWebsite.title);
    const currentDescTokens = tokenize(currentWebsite.description || '');

    const scoredWebsites: ScoredWebsite[] = allWebsites
        .filter(w => w.id !== currentWebsite.id) // Exclude current website
        .map(website => {
            let score = 0;
            const reasons: string[] = [];

            // 1. Category match (+5 points)
            if (website.category === currentWebsite.category) {
                score += 5;
                reasons.push('Same category');
            }

            // 2. Domain match (+3 points)
            const websiteDomain = getDomain(website.url);
            if (currentDomain && websiteDomain === currentDomain) {
                score += 3;
                reasons.push('Same website');
            }

            // 3. Title similarity (+0-4 points)
            const titleTokens = tokenize(website.title);
            const titleSimilarity = jaccardSimilarity(currentTitleTokens, titleTokens);
            if (titleSimilarity > 0) {
                const titleScore = Math.round(titleSimilarity * 4);
                score += titleScore;
                if (titleScore > 0) {
                    reasons.push('Similar title');
                }
            }

            // 4. Description similarity (+0-3 points)
            if (currentDescTokens.size > 0) {
                const descTokens = tokenize(website.description || '');
                const descSimilarity = jaccardSimilarity(currentDescTokens, descTokens);
                if (descSimilarity > 0) {
                    const descScore = Math.round(descSimilarity * 3);
                    score += descScore;
                    if (descScore > 0) {
                        reasons.push('Similar description');
                    }
                }
            }

            return { website, score, reasons };
        })
        .filter(item => item.score > 0) // Only include items with at least some similarity
        .sort((a, b) => b.score - a.score); // Sort by score descending

    return scoredWebsites.slice(0, limit).map(item => item.website);
};

/**
 * Get a human-readable explanation for why websites are related.
 * Useful for debugging or showing "why" to users.
 */
export const getRelationshipReason = (
    currentWebsite: Website,
    relatedWebsite: Website
): string[] => {
    const reasons: string[] = [];

    if (relatedWebsite.category === currentWebsite.category) {
        reasons.push(`Same category: ${currentWebsite.category}`);
    }

    const currentDomain = getDomain(currentWebsite.url);
    const relatedDomain = getDomain(relatedWebsite.url);
    if (currentDomain && relatedDomain === currentDomain) {
        reasons.push(`Same website: ${currentDomain}`);
    }

    const currentTokens = tokenize(currentWebsite.title);
    const relatedTokens = tokenize(relatedWebsite.title);
    const commonWords = [...currentTokens].filter(w => relatedTokens.has(w));
    if (commonWords.length > 0) {
        reasons.push(`Common keywords: ${commonWords.slice(0, 3).join(', ')}`);
    }

    return reasons.length > 0 ? reasons : ['Potentially related content'];
};
