import React from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  isSearchingAI?: boolean;
  placeholder?: string;
  suggestion?: string | null;
  onSuggestionClick?: (suggestion: string) => void;
  isAIModeEnabled?: boolean;
  onAIModeToggle?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isSearchingAI = false,
  placeholder = "Search websites...",
  suggestion,
  onSuggestionClick,
  isAIModeEnabled = false,
  onAIModeToggle,
}) => {
  const { isDarkMode } = useTheme();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.();
    }
  };

  const handleSuggestionClick = () => {
    if (suggestion && onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  return (
    <div className="relative" style={{ fontFamily: "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="flex gap-2">
        {/* AI Mode Toggle Button */}
        <button
          onClick={onAIModeToggle}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 flex-shrink-0 ${isAIModeEnabled
              ? isDarkMode
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/20'
              : isDarkMode
                ? 'bg-[#191919] border-[#2e2e2e] text-[#787774] hover:border-[#3e3e3e] hover:text-[#e9e9e9]'
                : 'bg-white border-[#e9e9e9] text-[#787774] hover:border-[#c9c9c9] hover:text-[#37352f]'
            }`}
          title={isAIModeEnabled ? 'AI Search enabled - click to disable' : 'Click to enable AI Search'}
        >
          <Sparkles className={`h-4 w-4 ${isAIModeEnabled ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">AI</span>
        </button>

        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearchingAI ? (
              <div className={`animate-spin rounded-full h-3.5 w-3.5 border-b border ${isDarkMode ? 'border-[#e9e9e9]' : 'border-[#37352f]'
                }`}></div>
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
            placeholder={isAIModeEnabled ? "Ask anything... (e.g., 'sites about learning React')" : placeholder}
            className={`block w-full pl-10 pr-4 py-2 border rounded-lg font-normal text-sm transition-all duration-300 focus:outline-none ${isAIModeEnabled
                ? isDarkMode
                  ? 'border-purple-500/50 bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-purple-400 ring-1 ring-purple-500/20'
                  : 'border-purple-300 bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-purple-400 ring-1 ring-purple-200'
                : isDarkMode
                  ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                  : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
              }`}
          />

          {/* AI Mode indicator inside input */}
          {isAIModeEnabled && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isDarkMode
                  ? 'text-purple-300 bg-purple-500/20'
                  : 'text-purple-600 bg-purple-100'
                }`}>
                {isSearchingAI ? 'Searching...' : 'AI Mode'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Spelling Suggestion - only for non-AI search */}
      {suggestion && value && !isAIModeEnabled && (
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