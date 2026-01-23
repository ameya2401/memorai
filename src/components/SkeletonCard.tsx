import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonCardProps {
    viewMode: 'grid' | 'list';
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ viewMode }) => {
    const { isDarkMode } = useTheme();

    const shimmerClass = `animate-pulse ${isDarkMode ? 'bg-[#2e2e2e]' : 'bg-[#e9e9e9]'}`;

    if (viewMode === 'list') {
        return (
            <div
                className={`border rounded-lg p-4 ${isDarkMode
                    ? 'bg-[#191919] border-[#2e2e2e]'
                    : 'bg-white border-[#e9e9e9]'
                    }`}
            >
                <div className="flex items-center gap-3">
                    {/* Favicon skeleton */}
                    <div className={`w-6 h-6 rounded ${shimmerClass}`} />

                    {/* Content skeleton */}
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className={`h-4 w-3/4 rounded ${shimmerClass}`} />
                        <div className={`h-3 w-1/2 rounded ${shimmerClass}`} />
                    </div>

                    {/* Category badge skeleton */}
                    <div className={`h-5 w-20 rounded ${shimmerClass}`} />

                    {/* Time skeleton */}
                    <div className={`h-3 w-16 rounded ${shimmerClass}`} />
                </div>
            </div>
        );
    }

    // Grid view skeleton
    return (
        <div
            className={`border rounded-lg overflow-hidden ${isDarkMode
                ? 'bg-[#191919] border-[#2e2e2e]'
                : 'bg-white border-[#e9e9e9]'
                }`}
        >
            <div className="p-6">
                {/* Header with favicon and category */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded ${shimmerClass}`} />
                        <div className={`h-5 w-16 rounded ${shimmerClass}`} />
                    </div>
                </div>

                {/* Title skeleton */}
                <div className={`h-4 w-full rounded mb-2 ${shimmerClass}`} />
                <div className={`h-4 w-2/3 rounded mb-3 ${shimmerClass}`} />

                {/* URL skeleton */}
                <div className={`h-3 w-3/4 rounded mb-4 ${shimmerClass}`} />

                {/* Description skeleton */}
                <div className={`h-3 w-full rounded mb-1 ${shimmerClass}`} />
                <div className={`h-3 w-5/6 rounded mb-1 ${shimmerClass}`} />
                <div className={`h-3 w-4/6 rounded mb-6 ${shimmerClass}`} />

                {/* Footer skeleton */}
                <div className={`pt-4 border-t ${isDarkMode ? 'border-[#2e2e2e]' : 'border-[#e9e9e9]'}`}>
                    <div className={`h-3 w-24 rounded ${shimmerClass}`} />
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;
