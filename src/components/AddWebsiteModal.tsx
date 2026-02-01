import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { X, Plus, Globe, Tag, FileText, Link } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: string[];
}

const AddWebsiteModal: React.FC<AddWebsiteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
}) => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Ensure URL has protocol
      let processedUrl = url.trim();
      if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = 'https://' + processedUrl;
      }

      const finalCategory = category.trim() || 'Uncategorized';

      // Check if category needs to be created (if it's not in the list and not Uncategorized/Recently Added)
      if (
        finalCategory !== 'Uncategorized' &&
        finalCategory !== 'Recently Added' &&
        !categories.includes(finalCategory)
      ) {
        const { error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: finalCategory,
            user_id: user.id
          })
          .select()
          .single();

        // Ignore duplicate error safely
        if (categoryError && categoryError.code !== '23505') {
          console.error('Error creating category:', categoryError);
        }
      }

      const { error } = await supabase.from('websites').insert({
        url: processedUrl,
        title: title.trim() || processedUrl,
        category: finalCategory,
        description: description.trim() || null,
        user_id: user.id,
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(processedUrl).hostname}&sz=32`,
      });

      if (error) throw error;

      toast.success('Website added successfully!');
      handleClose();
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add website';
      toast.error(errorMessage);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setTitle('');
    setCategory('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop, not the modal content
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 z-50 ${isDarkMode ? 'bg-black bg-opacity-80' : 'bg-white bg-opacity-80'
        }`}
      onClick={handleBackdropClick}
      style={{ fontFamily: "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <div className={`border rounded-lg w-full max-w-md transition-colors duration-300 ${isDarkMode ? 'bg-[#191919] border-[#2e2e2e]' : 'bg-white border-[#e9e9e9]'
        }`}>
        <div className={`flex items-center justify-between p-4 border-b transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e]' : 'border-[#e9e9e9]'
          }`}>
          <h2 className={`text-sm font-medium flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
            }`}>
            <Plus className="h-3.5 w-3.5" />
            Add Website
          </h2>
          <button
            onClick={handleClose}
            className={`rounded transition-all duration-150 ${isDarkMode
              ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
              : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
              }`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="url" className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
              }`}>
              URL *
            </label>
            <div className="relative">
              <Link className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                }`} />
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://example.com"
                className={`w-full pl-10 pr-3 py-1.5 border rounded-lg font-normal text-sm focus:outline-none transition-colors duration-300 ${isDarkMode
                  ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                  : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                  }`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="title" className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
              }`}>
              Title
            </label>
            <div className="relative">
              <Globe className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                }`} />
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Website title (optional)"
                className={`w-full pl-10 pr-3 py-1.5 border rounded-lg font-normal text-sm focus:outline-none transition-colors duration-300 ${isDarkMode
                  ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                  : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                  }`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
              }`}>
              Category
            </label>
            <div className="relative">
              <Tag className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                }`} />
              <input
                id="category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="categories"
                placeholder="e.g., AI Tools, Job Portals, Blogs"
                className={`w-full pl-10 pr-3 py-1.5 border rounded-lg font-normal text-sm focus:outline-none transition-colors duration-300 ${isDarkMode
                  ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                  : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                  }`}
              />
              <datalist id="categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label htmlFor="description" className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
              }`}>
              Description
            </label>
            <div className="relative">
              <FileText className={`absolute left-3 top-3 h-3.5 w-3.5 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                }`} />
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a note about this website..."
                rows={3}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg font-normal text-sm focus:outline-none resize-none transition-colors duration-300 ${isDarkMode
                  ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                  : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                  }`}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className={`flex-1 px-2 py-1.5 border rounded-lg transition-all duration-150 text-sm font-normal ${isDarkMode
                ? 'text-[#787774] border-[#2e2e2e] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                : 'text-[#787774] border-[#e9e9e9] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className={`flex-1 px-2 py-1.5 border rounded-lg transition-all duration-150 text-sm font-normal disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9] border-[#2e2e2e] hover:bg-[#3e3e3e]'
                : 'bg-[#f1f1ef] text-[#37352f] border-[#e9e9e9] hover:bg-[#e9e9e9]'
                }`}
            >
              {loading ? 'Adding...' : 'Add Website'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWebsiteModal;