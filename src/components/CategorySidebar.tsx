import React, { useState } from 'react';
import { Folder, FolderOpen, Hash, Settings, Clock, Bell, Star, ChevronDown, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { Category } from '../types';
import CategoryManagement from './CategoryManagement';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  totalWebsites: number;
  onCategoryChange: () => void;
  recentlyAddedCount: number;
  pendingRemindersCount: number;
  onAddWebsite: () => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  totalWebsites,
  onCategoryChange,
  recentlyAddedCount,
  pendingRemindersCount,
  onAddWebsite,
}) => {
  const { isDarkMode } = useTheme();
  const [showManagement, setShowManagement] = useState(false);

  return (
    <div className={`rounded-lg transition-all duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar ${isDarkMode
      ? 'bg-[#191919] border border-[#2e2e2e]'
      : 'bg-white border border-[#e9e9e9]'
      }`} >
      <div className="p-4">
        <h2 className={`font-medium text-sm mb-4 flex items-center gap-2.5 transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
          }`}>
          <Folder className="h-4 w-4" />
          Categories
        </h2>

        <button
          onClick={onAddWebsite}
          className={`w-full mb-4 border rounded-lg px-2 py-1.5 text-sm font-normal transition-all duration-150 flex items-center justify-center gap-2 ${isDarkMode
            ? 'bg-[#2e2e2e] text-[#e9e9e9] border-[#2e2e2e] hover:bg-[#3e3e3e]'
            : 'bg-[#f1f1ef] text-[#37352f] border-[#e9e9e9] hover:bg-[#e9e9e9]'
            }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Website
        </button>

        <div className="space-y-0.5">
          <button
            onClick={() => onCategorySelect('all')}
            className={`w-full text-left px-2 py-1.5 rounded transition-all duration-150 flex items-center justify-between text-sm ${selectedCategory === 'all'
              ? isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9]'
                : 'bg-[#f1f1ef] text-[#37352f]'
              : isDarkMode
                ? 'text-[#c9c9c9] hover:bg-[#2e2e2e] hover:text-[#e9e9e9]'
                : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
              }`}
          >
            <div className="flex items-center gap-2">
              {selectedCategory === 'all' ? (
                <FolderOpen className="h-3.5 w-3.5" />
              ) : (
                <Folder className="h-3.5 w-3.5" />
              )}
              <span className="font-normal">All Websites</span>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedCategory === 'all'
              ? isDarkMode
                ? 'text-[#e9e9e9] bg-[#3e3e3e]'
                : 'text-[#37352f] bg-[#e9e9e9]'
              : isDarkMode
                ? 'text-[#787774]'
                : 'text-[#9b9a97]'
              }`}>
              {totalWebsites}
            </span>
          </button>

          {/* Recently Added */}
          <button
            onClick={() => onCategorySelect('Recently Added')}
            className={`w-full text-left px-2 py-1.5 rounded transition-all duration-150 flex items-center justify-between text-sm ${selectedCategory === 'Recently Added'
              ? isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9]'
                : 'bg-[#f1f1ef] text-[#37352f]'
              : isDarkMode
                ? 'text-[#c9c9c9] hover:bg-[#2e2e2e] hover:text-[#e9e9e9]'
                : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
              }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-normal">Recently Added</span>
              {recentlyAddedCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedCategory === 'Recently Added'
                  ? isDarkMode
                    ? 'text-[#e9e9e9] bg-[#3e3e3e]'
                    : 'text-[#37352f] bg-[#e9e9e9]'
                  : isDarkMode
                    ? 'text-[#787774] bg-[#2e2e2e]'
                    : 'text-[#9b9a97] bg-[#f1f1ef]'
                  }`}>
                  New
                </span>
              )}
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedCategory === 'Recently Added'
              ? isDarkMode
                ? 'text-[#e9e9e9] bg-[#3e3e3e]'
                : 'text-[#37352f] bg-[#e9e9e9]'
              : isDarkMode
                ? 'text-[#787774]'
                : 'text-[#9b9a97]'
              }`}>
              {recentlyAddedCount}
            </span>
          </button>

          {/* Favorites (Starred) */}
          <button
            onClick={() => onCategorySelect('Favorites')}
            className={`w-full text-left px-2 py-1.5 rounded transition-all duration-150 flex items-center justify-between text-sm ${selectedCategory === 'Favorites'
              ? isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9]'
                : 'bg-[#f1f1ef] text-[#37352f]'
              : isDarkMode
                ? 'text-[#c9c9c9] hover:bg-[#2e2e2e] hover:text-[#e9e9e9]'
                : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
              }`}
          >
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5" />
              <span className="font-normal">Starred</span>
            </div>
          </button>

          {/* Reminders */}
          <button
            onClick={() => onCategorySelect('Reminders')}
            className={`w-full text-left px-2 py-1.5 rounded transition-all duration-150 flex items-center justify-between text-sm ${selectedCategory === 'Reminders'
              ? isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9]'
                : 'bg-[#f1f1ef] text-[#37352f]'
              : isDarkMode
                ? 'text-[#c9c9c9] hover:bg-[#2e2e2e] hover:text-[#e9e9e9]'
                : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
              }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5" />
              <span className="font-normal">Reminders</span>
              {pendingRemindersCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedCategory === 'Reminders'
                  ? isDarkMode
                    ? 'text-[#e9e9e9] bg-[#3e3e3e]'
                    : 'text-[#37352f] bg-[#e9e9e9]'
                  : isDarkMode
                    ? 'text-[#787774] bg-[#2e2e2e]'
                    : 'text-[#9b9a97] bg-[#f1f1ef]'
                  }`}>
                  {pendingRemindersCount}
                </span>
              )}
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedCategory === 'Reminders'
              ? isDarkMode
                ? 'text-[#e9e9e9] bg-[#3e3e3e]'
                : 'text-[#37352f] bg-[#e9e9e9]'
              : isDarkMode
                ? 'text-[#787774]'
                : 'text-[#9b9a97]'
              }`}>
              {pendingRemindersCount}
            </span>
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.name)}
              className={`w-full text-left px-2 py-1.5 rounded transition-all duration-150 flex items-center justify-between text-sm group relative ${selectedCategory === category.name
                ? isDarkMode
                  ? 'bg-[#2e2e2e] text-[#e9e9e9]'
                  : 'bg-[#f1f1ef] text-[#37352f]'
                : isDarkMode
                  ? 'text-[#c9c9c9] hover:bg-[#2e2e2e] hover:text-[#e9e9e9]'
                  : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
                }`}
            >
              {selectedCategory === category.name && (
                <div className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-purple-500`}></div>
              )}
              <div className="flex items-center gap-2">
                {selectedCategory === category.name ? (
                  <FolderOpen className="h-3.5 w-3.5" />
                ) : (
                  <Hash className="h-3.5 w-3.5" />
                )}
                <span className="capitalize truncate font-normal">{category.name}</span>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedCategory === category.name
                ? isDarkMode
                  ? 'text-[#e9e9e9] bg-[#3e3e3e]'
                  : 'text-[#37352f] bg-[#e9e9e9]'
                : isDarkMode
                  ? 'text-[#787774]'
                  : 'text-[#9b9a97]'
                }`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-8">
            <Hash className={`h-5 w-5 mx-auto mb-2 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'
              }`} />
            <p className={`text-sm font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'
              }`}>
              No categories yet
            </p>
          </div>
        )}

        {/* Category Management Toggle */}
        <div className={`mt-4 pt-4 border-t transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e]' : 'border-[#e9e9e9]'
          }`}>
          <button
            onClick={() => setShowManagement(!showManagement)}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm font-normal transition-all duration-150 ${isDarkMode
              ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
              : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
              }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              <span>Manage Categories</span>
            </div>
            <div className={`transform transition-transform duration-200 ${showManagement ? 'rotate-180' : ''
              }`}>
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          </button>

          {showManagement && (
            <div className="mt-3">
              <CategoryManagement
                categories={categories}
                onCategoryChange={onCategoryChange}
              />
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default CategorySidebar;