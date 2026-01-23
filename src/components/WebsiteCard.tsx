import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Trash2, Globe, Copy, Star } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import type { Website } from '../types';

interface WebsiteCardProps {
  website: Website;
  viewMode: 'grid' | 'list' | 'graph';
  onDelete: (id: string) => void;
  onView: (website: Website) => void;
  onTogglePin: (website: Website) => void;
}

const WebsiteCard: React.FC<WebsiteCardProps> = ({ website, viewMode, onDelete, onView, onTogglePin }) => {
  const { isDarkMode } = useTheme();

  const cardStyle = { fontFamily: "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this website?')) {
      onDelete(website.id);
    }
  };

  const handleView = () => {
    onView(website);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(website.url);
      toast.success('URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTogglePin(website);
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`border rounded-lg transition-all duration-300 p-4 cursor-pointer group focus:outline-none ${isDarkMode
          ? 'bg-[#191919] border-[#2e2e2e] hover:bg-[#2e2e2e]'
          : 'bg-white border-[#e9e9e9] hover:bg-[#f1f1ef]'
          }`}
        onClick={handleView}
        tabIndex={0}
        style={cardStyle}
      >
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {website.favicon || getFaviconUrl(website.url) ? (
                <img
                  src={website.favicon || getFaviconUrl(website.url)!}
                  alt=""
                  className="w-6 h-6"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <Globe className={`h-4 w-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className={`font-normal truncate transition-colors duration-300 text-sm ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
                }`}>{website.title}</h3>
              <p className={`text-xs truncate transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                }`}>{website.url}</p>
              {website.description && (
                <p className={`text-xs mt-1 line-clamp-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
                  }`}>{website.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors duration-300 ${isDarkMode ? 'bg-[#3e3e3e] text-[#e9e9e9]' : 'bg-[#e9e9e9] text-[#37352f]'
                }`}>
                {website.category}
              </span>
              <span className={`text-xs font-normal whitespace-nowrap transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                }`}>
                {formatDistanceToNow(new Date(website.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-4 flex-shrink-0">
            <button
              onClick={handleCopy}
              className={`p-2 rounded transition-all duration-150 ${isDarkMode
                ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                }`}
              title="Copy URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className={`p-2 rounded transition-all duration-150 ${isDarkMode
                ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                }`}
              title="Open website"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={handleDelete}
              className={`p-2 rounded transition-all duration-150 ${isDarkMode
                ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                }`}
              title="Delete website"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleTogglePin}
              className={`p-2 rounded transition-all duration-150 ${isDarkMode
                ? 'text-[#787774] hover:text-[#fbbf24] hover:bg-[#2e2e2e]'
                : 'text-[#787774] hover:text-[#fbbf24] hover:bg-[#f1f1ef]'
                } ${website.is_pinned ? 'text-[#fbbf24]' : ''}`}
              title={website.is_pinned ? "Unpin website" : "Pin website"}
            >
              <Star className={`h-3.5 w-3.5 ${website.is_pinned ? 'fill-[#fbbf24]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0">
              {website.favicon || getFaviconUrl(website.url) ? (
                <img
                  src={website.favicon || getFaviconUrl(website.url)!}
                  alt=""
                  className="w-6 h-6"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <Globe className={`h-4 w-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className={`font-normal line-clamp-2 leading-5 transition-colors duration-300 text-sm ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
                }`}>{website.title}</h3>
              <p className={`text-xs truncate mt-1 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                }`}>{website.url}</p>
              {website.description && (
                <p className={`text-xs mt-2 line-clamp-2 leading-5 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
                  }`}>{website.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLinkClick}
                className={`p-1 transition-colors ${isDarkMode ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-black hover:bg-gray-100'
                  }`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={handleDelete}
                className={`p-1 transition-colors ${isDarkMode ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-black hover:bg-gray-100'
                  }`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleTogglePin}
                className={`p-1 transition-colors ${isDarkMode
                  ? 'text-gray-500 hover:text-[#fbbf24] hover:bg-gray-800'
                  : 'text-gray-500 hover:text-[#fbbf24] hover:bg-gray-100'
                  } ${website.is_pinned ? 'text-[#fbbf24]' : ''}`}
              >
                <Star className={`h-4 w-4 ${website.is_pinned ? 'fill-[#fbbf24]' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${isDarkMode ? 'bg-[#3e3e3e] text-[#e9e9e9]' : 'bg-[#e9e9e9] text-[#37352f]'
              }`}>
              {website.category}
            </span>
            <span className={`font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
              }`}>
              {formatDistanceToNow(new Date(website.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border rounded-lg transition-all duration-300 overflow-hidden group cursor-pointer focus:outline-none ${isDarkMode
        ? 'bg-[#191919] border-[#2e2e2e] hover:bg-[#2e2e2e]'
        : 'bg-white border-[#e9e9e9] hover:bg-[#f1f1ef]'
        }`}
      onClick={handleView}
      tabIndex={0}
      style={cardStyle}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              {website.favicon || getFaviconUrl(website.url) ? (
                <img
                  src={website.favicon || getFaviconUrl(website.url)!}
                  alt=""
                  className="w-6 h-6"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <Globe className={`h-5 w-5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
              )}
            </div>
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors duration-300 truncate max-w-[120px] ${isDarkMode ? 'bg-[#3e3e3e] text-[#e9e9e9]' : 'bg-[#e9e9e9] text-[#37352f]'
              }`}>
              {website.category}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0 ml-2">
            <button
              onClick={handleCopy}
              className={`p-2 rounded transition-all duration-150 ${isDarkMode
                ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                }`}
              title="Copy URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className={`p-2 rounded transition-all duration-150 ${isDarkMode
                ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                }`}
              title="Open website"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={handleDelete}
              className={`p-2 rounded transition-all duration-150 ${isDarkMode
                ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                }`}
              title="Delete website"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleTogglePin}
              className={`p-2 rounded transition-all duration-150 ${isDarkMode
                ? 'text-[#787774] hover:text-[#fbbf24] hover:bg-[#2e2e2e]'
                : 'text-[#787774] hover:text-[#fbbf24] hover:bg-[#f1f1ef]'
                } ${website.is_pinned ? 'text-[#fbbf24]' : ''}`}
              title={website.is_pinned ? "Unpin website" : "Pin website"}
            >
              <Star className={`h-3.5 w-3.5 ${website.is_pinned ? 'fill-[#fbbf24]' : ''}`} />
            </button>
          </div>
        </div>

        <h3 className={`font-medium text-sm mb-3 line-clamp-2 leading-5 transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
          }`}>
          {website.title}
        </h3>

        <p className={`text-xs mb-4 truncate transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
          }`}>
          {website.url}
        </p>

        {website.description && (
          <p className={`text-xs mb-6 line-clamp-3 leading-5 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
            }`}>
            {website.description}
          </p>
        )}

        <div className={`flex items-center justify-between pt-4 border-t transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e] text-[#787774]' : 'border-[#e9e9e9] text-[#787774]'
          }`}>
          <span className="text-xs font-normal">
            Added {formatDistanceToNow(new Date(website.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WebsiteCard;