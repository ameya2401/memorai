import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Globe, Edit2, Save, Calendar, Bell, BellOff, Link2 } from 'lucide-react';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { checkReminderMigration } from '../lib/reminderMigration';
import { findRelatedWebsites } from '../lib/recommender';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import type { Website } from '../types';

interface WebsiteDetailsModalProps {
  website: Website;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  categories: string[];
  allWebsites?: Website[];
  onViewRelated?: (website: Website) => void;
}

const WebsiteDetailsModal: React.FC<WebsiteDetailsModalProps> = ({
  website,
  isOpen,
  onClose,
  onUpdate,
  categories,
  allWebsites = [],
  onViewRelated,
}) => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reminderMigrationExists, setReminderMigrationExists] = useState(true);

  // Local state for immediate UI updates
  const [currentWebsite, setCurrentWebsite] = useState(website);

  // Local state for editing form
  const [editData, setEditData] = useState({
    title: website.title,
    category: website.category,
    description: website.description || '',
    newCategory: '',
  });

  useEffect(() => {
    setCurrentWebsite(website);
    setEditData({
      title: website.title,
      category: website.category,
      description: website.description || '',
      newCategory: '',
    });
  }, [website]);

  useEffect(() => {
    // Check if reminder migration exists
    if (user) {
      checkReminderMigration(user.id).then(setReminderMigrationExists);
    }
  }, [user]);

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const finalCategory = editData.category === '__create_new__' ? editData.newCategory.trim() : editData.category;

      if (!finalCategory) {
        toast.error('Category name is required');
        setIsSaving(false);
        return;
      }

      // If creating a new category, insert it into the categories table first
      if (editData.category === '__create_new__') {
        const { error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: finalCategory,
            user_id: user.id
          })
          .select()
          .single();

        // Ignore duplicate error (23505 is unique violation code in Postgres) - means it already exists which is fine
        if (categoryError && categoryError.code !== '23505') {
          console.error('Error creating category:', categoryError);
          // We continue anyway, as the website update might still succeed with the string
        }
      }

      const { error } = await supabase
        .from('websites')
        .update({
          title: editData.title.trim(),
          category: finalCategory,
          description: editData.description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentWebsite.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Website updated successfully');

      setCurrentWebsite(prev => ({
        ...prev,
        title: editData.title.trim(),
        category: finalCategory,
        description: editData.description.trim() || undefined,
        updated_at: new Date().toISOString(),
      }));

      setIsEditing(false);
      onUpdate();
    } catch (error: unknown) {
      toast.error('Failed to update website');
      console.error('Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      title: currentWebsite.title,
      category: currentWebsite.category,
      description: currentWebsite.description || '',
      newCategory: '',
    });
    setIsEditing(false);
  };

  const handleToggleReminders = async () => {
    if (!user) return;

    if (!reminderMigrationExists) {
      toast.error('Reminder feature requires database migration. Please see MIGRATION_INSTRUCTIONS.md');
      return;
    }

    try {
      console.log('Toggling reminders for website:', currentWebsite.id);

      // Optimistic update
      const newReminderStatus = !currentWebsite.reminder_dismissed;
      const newLastRemindedAt = newReminderStatus ? null : new Date().toISOString();

      setCurrentWebsite(prev => ({
        ...prev,
        reminder_dismissed: newReminderStatus,
        last_reminded_at: newLastRemindedAt
      }));

      const { data, error } = await supabase
        .from('websites')
        .update({
          reminder_dismissed: newReminderStatus,
          last_reminded_at: newLastRemindedAt,
        })
        .eq('id', currentWebsite.id)
        .eq('user_id', user.id)
        .select();

      if (error) {
        // Revert on error
        setCurrentWebsite(prev => ({
          ...prev,
          reminder_dismissed: !newReminderStatus,
          last_reminded_at: !newReminderStatus ? null : new Date().toISOString()
        }));

        console.error('Supabase error toggling reminders:', error);

        // Check if the columns don't exist
        if (error.message.includes('column "reminder_dismissed" of relation "websites" does not exist') ||
          error.message.includes('column "last_reminded_at" of relation "websites" does not exist')) {
          toast.error('Reminder feature not yet available. Database migration needed.');
        } else {
          toast.error('Failed to update reminder settings');
        }
        throw error;
      }

      console.log('Database update result:', data);

      toast.success(
        newReminderStatus
          ? 'Reminders disabled for this website'
          : 'Reminders enabled for this website'
      );
      onUpdate();
    } catch (error: unknown) {
      console.error('Error toggling reminders:', error);
    }
  };

  if (!isOpen) return null;

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ fontFamily: "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#191919] border border-[#2e2e2e]' : 'bg-white border border-[#e9e9e9]'
        }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e]' : 'border-[#e9e9e9]'
          }`}>
          <div className="flex items-center gap-2">
            {currentWebsite.favicon || getFaviconUrl(currentWebsite.url) ? (
              <img
                src={currentWebsite.favicon || getFaviconUrl(currentWebsite.url)!}
                alt=""
                className="w-6 h-6 rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-[#2e2e2e]' : 'bg-[#f1f1ef]'
                }`}>
                <Globe className={`h-3.5 w-3.5 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                  }`} />
              </div>
            )}
            <h2 className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
              }`}>Website Details</h2>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className={`px-3 py-1.5 border rounded-lg transition-all duration-150 flex items-center gap-2 text-xs font-medium ${isDarkMode
                  ? 'border-[#2e2e2e] text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e] hover:border-[#3e3e3e]'
                  : 'border-[#e9e9e9] text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef] hover:border-[#d4d4d4]'
                  }`}
                title="Edit website"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>EDIT</span>
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded transition-all duration-150 ${isDarkMode
                ? 'text-[#787774] hover:text-red-400 hover:bg-red-900/30'
                : 'text-[#787774] hover:text-red-600 hover:bg-red-50'
                }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
              }`}>Title</label>
            {isEditing ? (
              <input
                id="title"
                type="text"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-2 py-1.5 border rounded-lg font-normal text-sm focus:outline-none transition-colors duration-300 ${isDarkMode
                  ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                  : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                  }`}
                placeholder="Website title"
              />
            ) : (
              <p className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
                }`}>{currentWebsite.title}</p>
            )}
          </div>

          {/* URL */}
          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
              }`}>URL</label>
            <div className="flex items-center gap-2">
              <a
                href={currentWebsite.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 break-all text-sm font-normal underline transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9] hover:text-white' : 'text-[#787774] hover:text-black'
                  }`}>{currentWebsite.url}</a>
              <a
                href={currentWebsite.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded transition-all duration-150 ${isDarkMode
                  ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                  : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                  }`}
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
              }`}>Category</label>
            {isEditing ? (
              <div>
                <select
                  value={editData.category}
                  onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value, newCategory: '' }))}
                  className={`w-full px-2 py-1.5 border rounded-lg font-normal text-sm focus:outline-none transition-colors duration-300 ${isDarkMode
                    ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9]'
                    : 'border-[#e9e9e9] bg-white text-[#37352f]'
                    }`}
                >
                  <option value="Uncategorized">Uncategorized</option>
                  <option value="Recently Added">📝 Recently Added</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="__create_new__">➕ Create New Category</option>
                </select>
                {editData.category === '__create_new__' && (
                  <input
                    type="text"
                    value={editData.newCategory}
                    onChange={(e) => setEditData(prev => ({ ...prev, newCategory: e.target.value }))}
                    placeholder="Enter new category name..."
                    className={`w-full mt-2 px-2 py-1.5 border rounded-lg font-normal text-sm focus:outline-none transition-colors duration-300 ${isDarkMode
                      ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                      : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                      }`}
                    autoFocus
                  />
                )}
              </div>
            ) : (
              <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded transition-colors duration-300 ${isDarkMode
                ? 'bg-[#3e3e3e] text-[#e9e9e9]'
                : 'bg-[#e9e9e9] text-[#37352f]'
                }`}>
                {currentWebsite.category}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
              }`}>Description</label>
            {isEditing ? (
              <textarea
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className={`w-full px-2 py-1.5 border rounded-lg font-normal text-sm focus:outline-none transition-colors duration-300 ${isDarkMode
                  ? 'border-[#2e2e2e] bg-[#191919] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                  : 'border-[#e9e9e9] bg-white text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                  }`}
                placeholder="Add a description or notes about this website..."
              />
            ) : (
              <p className={`text-sm font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
                }`}>
                {currentWebsite.description || (
                  <span className={`italic transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'
                    }`}>No description added</span>
                )}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className={`border-t pt-4 transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e]' : 'border-[#e9e9e9]'
            }`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className={`flex items-center gap-2 font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
                }`}>
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Added {formatDistanceToNow(new Date(currentWebsite.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className={`font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                }`}>
                {format(new Date(currentWebsite.created_at), 'MMM d, yyyy \'at\' h:mm a')}
              </div>
            </div>

            {/* Reminder Status */}
            {reminderMigrationExists && (
              <div className={`mt-4 pt-4 border-t transition-colors duration-300 ${isDarkMode ? 'border-gray-600' : 'border-gray-100'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {currentWebsite.reminder_dismissed ? (
                      <BellOff className={`h-4 w-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'
                        }`} />
                    ) : (
                      <Bell className="h-4 w-4 text-gray-600" />
                    )}
                    <span className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      {currentWebsite.reminder_dismissed ? 'Reminders Disabled' : 'Reminders Enabled'}
                    </span>
                  </div>
                  <button
                    onClick={handleToggleReminders}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${currentWebsite.reminder_dismissed
                      ? isDarkMode
                        ? 'bg-green-600 text-white hover:bg-green-500'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                      : isDarkMode
                        ? 'bg-red-600 text-white hover:bg-red-500'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                  >
                    {currentWebsite.reminder_dismissed ? 'Enable' : 'Disable'}
                  </button>
                </div>
                {!currentWebsite.reminder_dismissed && (
                  <p className={`text-xs mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    {differenceInDays(new Date(), new Date(currentWebsite.created_at)) >= 3
                      ? 'This website is eligible for reminders'
                      : `Reminders will start in ${3 - differenceInDays(new Date(), new Date(currentWebsite.created_at))} day(s)`
                    }
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons (Save/Cancel) - Moved here as requested */}
          {isEditing && (
            <div className={`flex items-center justify-end gap-2 pt-4 border-t transition-colors duration-300 ${isDarkMode
              ? 'border-[#2e2e2e]'
              : 'border-[#e9e9e9]'
              }`}>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className={`px-2 py-1.5 border rounded-lg transition-all duration-150 text-sm font-normal disabled:opacity-50 ${isDarkMode
                  ? 'text-[#787774] border-[#2e2e2e] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                  : 'text-[#787774] border-[#e9e9e9] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editData.title.trim() || (editData.category === '__create_new__' && !editData.newCategory.trim())}
                className={`px-2 py-1.5 rounded-lg transition-all duration-150 text-sm font-normal disabled:opacity-50 flex items-center gap-2 ${isDarkMode
                  ? 'bg-[#2e2e2e] text-[#e9e9e9] hover:bg-[#3e3e3e]'
                  : 'bg-[#f1f1ef] text-[#37352f] hover:bg-[#e9e9e9]'
                  }`}
              >
                {isSaving ? (
                  <>
                    <div className={`w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin ${isDarkMode ? 'border-[#e9e9e9]' : 'border-[#37352f]'
                      }`} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Related Websites Section - Hidden when editing */}
          {!isEditing && allWebsites.length > 1 && (() => {
            const relatedWebsites = findRelatedWebsites(currentWebsite, allWebsites, 4);
            if (relatedWebsites.length === 0) return null;

            return (
              <div className={`p-4 border-t transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e]' : 'border-[#e9e9e9]'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className={`h-4 w-4 ${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'}`} />
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'}`}>
                    Related to this item
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedWebsites.map((relatedSite) => (
                    <button
                      key={relatedSite.id}
                      onClick={() => onViewRelated?.(relatedSite)}
                      className={`text-left p-3 rounded-lg border transition-all duration-150 hover:scale-[1.02] ${isDarkMode
                        ? 'border-[#2e2e2e] bg-[#191919] hover:bg-[#2e2e2e] hover:border-[#3e3e3e]'
                        : 'border-[#e9e9e9] bg-[#f7f6f3] hover:bg-[#f1f1ef] hover:border-[#c9c9c9]'
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {relatedSite.favicon ? (
                            <img src={relatedSite.favicon} alt="" className="w-4 h-4 rounded" />
                          ) : (
                            <Globe className={`w-4 h-4 ${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'}`} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'}`}>
                            {relatedSite.title}
                          </p>
                          <p className={`text-xs truncate mt-0.5 ${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'}`}>
                            {relatedSite.category}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default WebsiteDetailsModal;