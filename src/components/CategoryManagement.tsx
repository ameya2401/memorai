import React, { useState } from 'react';
import { Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import type { Category } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

interface CategoryManagementProps {
  categories: Category[];
  onCategoryChange: () => void;
}

interface DeleteConfirmationProps {
  category: Category;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  category,
  onConfirm,
  onCancel,
  isDeleting
}) => {
  const { isDarkMode } = useTheme();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ fontFamily: "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className={`rounded-lg p-4 max-w-md w-full mx-4 transition-colors duration-300 ${isDarkMode ? 'bg-[#191919] border border-[#2e2e2e]' : 'bg-white border border-[#e9e9e9]'
        }`}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 rounded-full ${isDarkMode ? 'bg-red-600/20' : 'bg-red-100'
            }`}>
            <AlertTriangle className={`h-3.5 w-3.5 ${isDarkMode ? 'text-red-400' : 'text-red-600'
              }`} />
          </div>
          <h3 className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
            }`}>Delete Category</h3>
        </div>

        <p className={`text-sm font-normal mb-4 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
          }`}>
          Are you sure you want to delete the category "{category.name}"?
          {category.count > 0 && (
            <span className={`block mt-2 font-medium transition-colors duration-300 ${isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
              Warning: This category is used by {category.count} website{category.count !== 1 ? 's' : ''}.
              You cannot delete a category that is in use.
            </span>
          )}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className={`px-2 py-1.5 border rounded-lg transition-all duration-150 text-sm font-normal disabled:opacity-50 ${isDarkMode
              ? 'text-[#787774] border-[#2e2e2e] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
              : 'text-[#787774] border-[#e9e9e9] hover:text-[#37352f] hover:bg-[#f1f1ef]'
              }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || category.count > 0}
            className={`px-2 py-1.5 rounded-lg transition-all duration-150 text-sm font-normal disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
              : 'bg-red-600 text-white hover:bg-red-700'
              }`}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories,
  onCategoryChange
}) => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !user) return;

    const trimmedName = newCategoryName.trim();

    // Prevent creation of system categories
    if (trimmedName.toLowerCase() === 'recently added') {
      toast.error('"Recently Added" is a system category and cannot be created manually');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/categories?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.error('Category already exists');
        } else {
          toast.error(result.error || 'Failed to create category');
        }
        return;
      }

      toast.success('Category created successfully');
      setNewCategoryName('');
      setIsAddingCategory(false);
      onCategoryChange();
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categories?userId=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: category.id,
          name: category.name
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409 && result.inUse) {
          toast.error(`Cannot delete "${category.name}" - it is being used by websites`);
        } else {
          toast.error(result.error || 'Failed to delete category');
        }
        return;
      }

      toast.success('Category deleted successfully');
      setCategoryToDelete(null);
      onCategoryChange();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateCategory();
    } else if (e.key === 'Escape') {
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  return (
    <>
      <div className="space-y-1" style={{ fontFamily: "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {/* Add Category Button */}
        <button
          onClick={() => setIsAddingCategory(true)}
          className={`w-full flex items-center justify-center gap-2 px-2 py-1.5 border-2 border-dashed rounded-lg text-sm font-normal transition-all duration-150 ${isDarkMode
            ? 'border-[#2e2e2e] text-[#787774] hover:border-[#3e3e3e] hover:text-[#e9e9e9]'
            : 'border-[#e9e9e9] text-[#787774] hover:border-[#c9c9c9] hover:text-[#37352f]'
            }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Category
        </button>

        {/* Add Category Modal */}
        {isAddingCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ fontFamily: "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            <div className={`rounded-lg p-4 max-w-md w-full mx-4 transition-colors duration-300 ${isDarkMode ? 'bg-[#191919] border border-[#2e2e2e]' : 'bg-white border border-[#e9e9e9]'
              }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
                  }`}>Add New Category</h3>
                <button
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }}
                  className={`p-1 rounded transition-all duration-150 ${isDarkMode
                    ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                    : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                    }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter category name..."
                className={`w-full px-3 py-2 text-sm border rounded-lg font-normal focus:outline-none transition-colors duration-300 mb-4 ${isDarkMode
                  ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                  : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                  }`}
                autoFocus
                disabled={isCreating}
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }}
                  disabled={isCreating}
                  className={`px-3 py-1.5 border rounded-lg transition-all duration-150 text-sm font-normal disabled:opacity-50 ${isDarkMode
                    ? 'text-[#787774] border-[#2e2e2e] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                    : 'text-[#787774] border-[#e9e9e9] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || isCreating}
                  className={`px-3 py-1.5 rounded-lg text-sm font-normal transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
                    ? 'bg-[#2e2e2e] text-[#e9e9e9] hover:bg-[#3e3e3e]'
                    : 'bg-[#37352f] text-white hover:bg-[#2f2e2a]'
                    }`}
                >
                  {isCreating ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Categories List */}
        {categories.length > 0 && (
          <div className="space-y-0.5">
            {categories.map((category) => {
              // Don't show 'Recently Added' in the management interface as it's a system category
              if (category.name === 'Recently Added') {
                return null;
              }

              return (
                <div
                  key={category.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded transition-all duration-150 group ${isDarkMode
                    ? 'hover:bg-[#2e2e2e]'
                    : 'hover:bg-[#f1f1ef]'
                    }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className={`text-sm font-normal capitalize transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
                      }`}>{category.name}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded transition-colors duration-300 ${isDarkMode ? 'bg-[#3e3e3e] text-[#e9e9e9]' : 'bg-[#e9e9e9] text-[#37352f]'
                      }`}>
                      {category.count}
                    </span>
                  </div>
                  <button
                    onClick={() => setCategoryToDelete(category)}
                    className={`p-1 rounded transition-all duration-150 opacity-0 group-hover:opacity-100 ${isDarkMode
                      ? 'text-[#787774] hover:text-red-400 hover:bg-[#2e2e2e]'
                      : 'text-[#787774] hover:text-red-600 hover:bg-[#f1f1ef]'
                      }`}
                    title={category.count > 0 ? 'Cannot delete category in use' : 'Delete category'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {categories.length === 0 && !isAddingCategory && (
          <p className={`text-sm font-normal text-center py-4 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
            }`}>
            No custom categories yet
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <DeleteConfirmation
          category={categoryToDelete}
          onConfirm={() => handleDeleteCategory(categoryToDelete)}
          onCancel={() => setCategoryToDelete(null)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
};

export default CategoryManagement;