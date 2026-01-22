import React from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  isSearchingAI?: boolean;
  placeholder?: string;
  suggestion?: string | null;  // Spelling suggestion
  onSuggestionClick?: (suggestion: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isSearchingAI = false,
  placeholder = "Search websites...",
  suggestion,
  onSuggestionClick,
}) => {
  const { isDarkMode } = useTheme();
  const isAISearch = value.startsWith('ai:');
  const aiQuery = isAISearch ? value.slice(3).trim() : '';
  const canSearchAI = isAISearch && aiQuery.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Only trigger search if it's not an AI search or if AI query is not empty
      if (!isAISearch || canSearchAI) {
        onSearch?.();
      }
    }
  };

  const handleSuggestionClick = () => {
    if (suggestion && onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  return (
    <div className="relative" style={{ fontFamily: "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearchingAI ? (
            <div className={`animate-spin rounded-full h-3.5 w-3.5 border-b border ${isDarkMode ? 'border-[#e9e9e9]' : 'border-[#37352f]'
              }`}></div>
          ) : isAISearch ? (
            <Sparkles className={`h-3.5 w-3.5 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
              }`} />
          ) : (
            <Search className={`h-3.5 w-3.5 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
              }`} />
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`block w-full pl-10 ${isAISearch && canSearchAI ? 'pr-20' : 'pr-4'} py-2 border rounded-lg font-normal text-sm transition-all duration-300 focus:outline-none ${isDarkMode
            ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
            : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
            }`}
        />

        {isAISearch && canSearchAI && (
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded transition-colors duration-300 ${isDarkMode
              ? 'text-[#e9e9e9] bg-[#3e3e3e]'
              : 'text-[#37352f] bg-[#e9e9e9]'
              }`}>
              AI
            </span>
            <button
              onClick={onSearch}
              disabled={isSearchingAI}
              className={`px-2 py-1 rounded transition-all duration-150 text-xs font-normal disabled:opacity-50 ${isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9] hover:bg-[#3e3e3e]'
                : 'bg-[#f1f1ef] text-[#37352f] hover:bg-[#e9e9e9]'
                }`}
              title="Press Enter or click to search"
            >
              {isSearchingAI ? '...' : 'Search'}
            </button>
          </div>
        )}

        {isAISearch && !canSearchAI && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded transition-colors duration-300 ${isDarkMode
              ? 'text-[#787774] bg-[#3e3e3e]'
              : 'text-[#787774] bg-[#e9e9e9]'
              }`}>
              AI
            </span>
          </div>
        )}

        {!value && !isAISearch && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <span className={`text-xs font-normal transition-colors duration-300 ${isDarkMode
              ? 'text-[#787774]'
              : 'text-[#9b9a97]'
              }`}>
              prefix "ai:" for smart search
            </span>
          </div>
        )}
      </div>

      {/* Spelling Suggestion */}
      {suggestion && value && !isAISearch && (
        <div className={`mt-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-300 ${isDarkMode
          ? 'bg-[#191919] border border-[#2e2e2e]'
          : 'bg-[#f7f6f3] border border-[#e9e9e9]'
          }`}>
          <span className={`${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'}`}>
            Did you mean:{' '}
          </span>
          <button
            onClick={handleSuggestionClick}
            className={`font-medium hover:underline focus:outline-none ${isDarkMode
              ? 'text-blue-400 hover:text-blue-300'
              : 'text-blue-600 hover:text-blue-700'
              }`}
          >
            {suggestion}
          </button>
          <span className={`ml-2 text-xs ${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'}`}>
            (click to apply)
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchBar;