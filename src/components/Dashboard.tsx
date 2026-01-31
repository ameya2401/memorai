import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { searchWebsitesWithAI } from '../lib/gemini';
import { smartSearch, buildVocabulary } from '../lib/smartSearch';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useReminders } from '../hooks/useReminders';
import type { Website, Category } from '../types';
import WebsiteCard from './WebsiteCard';
import SkeletonCard from './SkeletonCard';
import SearchBar from './SearchBar';
import CategorySidebar from './CategorySidebar';
import AddWebsiteModal from './AddWebsiteModal';
import WebsiteDetailsModal from './WebsiteDetailsModal';
import RemindersPanel from './RemindersPanel';
import KnowledgeGraph from './KnowledgeGraph';
import ThemeToggle from './ThemeToggle';
import { LogOut, Plus, Grid, List, Download, Network, Star } from 'lucide-react';
import { signOut } from '../lib/supabase';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [filteredWebsites, setFilteredWebsites] = useState<Website[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // The query that's actually being used for search
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'graph'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchSuggestion, setSearchSuggestion] = useState<string | null>(null);
  const [isAIModeEnabled, setIsAIModeEnabled] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ITEMS_PER_PAGE = 24;

  // Build vocabulary for spelling suggestions (memoized)
  const vocabulary = useMemo(() => buildVocabulary(websites), [websites]);

  // Callback to trigger data refresh
  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Callback specifically for category changes
  const handleCategoryChange = () => {
    fetchCategories();
    fetchWebsites(); // Also refresh websites to update counts
  };

  // Initialize reminder system
  const {
    getPendingReminders,
    pendingRemindersCount
  } = useReminders(websites, user?.id, triggerRefresh);

  useEffect(() => {
    if (user) {
      fetchWebsites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshTrigger]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to both websites and categories changes
    const websitesChannel = supabase.channel('websites-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'websites',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchWebsites();
      })
      .subscribe();

    const categoriesChannel = supabase.channel('categories-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'categories',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(websitesChannel);
        supabase.removeChannel(categoriesChannel);
      } catch {
        // Cleanup error ignored
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Debounced search
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If AI mode is enabled, don't auto-trigger - wait for explicit search (Enter key)
    if (isAIModeEnabled) {
      return;
    }

    // For regular text search, debounce it (150ms for faster response)
    debounceTimerRef.current = setTimeout(() => {
      setActiveSearchQuery(searchQuery);
      filterWebsites(searchQuery);
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isAIModeEnabled]);

  // Filter when active search query, websites, or category changes
  useEffect(() => {
    if (dataLoaded) {
      filterWebsites(activeSearchQuery);
    } else {
      // If data not loaded yet, just set filtered to current websites
      setFilteredWebsites(websites);
    }
    // Reset visible count when filters change
    setVisibleCount(ITEMS_PER_PAGE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websites, selectedCategory, activeSearchQuery, dataLoaded]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingMore && visibleCount < filteredWebsites.length) {
          setIsLoadingMore(true);

          // Generate cheeky message based on selected category or content
          const messages = [
            "Digging up more digital gold...",
            "Summoning more links from the void...",
            "Loading your second brain...",
            "Fetching more brilliance...",
            "Scrolling down memory lane...",
          ];

          if (selectedCategory === 'Development') {
            messages.push("Compiling more code snippets...", "Debugging the infinite scroll...");
          } else if (selectedCategory === 'Design') {
            messages.push("Rendering more pixel perfection...", "Aligning grids...");
          } else if (selectedCategory === 'Research') {
            messages.push(" citing more sources...", "Peer reviewing your bookmarks...");
          }

          setLoadingMessage(messages[Math.floor(Math.random() * messages.length)]);

          // Artificial delay to make it feel substantial
          setTimeout(() => {
            setVisibleCount(prev => prev + ITEMS_PER_PAGE);
            setIsLoadingMore(false);
          }, 800);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [filteredWebsites.length, visibleCount, isLoadingMore, selectedCategory]);

  const fetchWebsites = async () => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWebsites(data || []);

      // Fetch categories from dedicated categories table
      await fetchCategories(data || []);

      // Mark data as loaded
      setDataLoaded(true);
    } catch (error: unknown) {
      toast.error('Failed to fetch websites');
      console.error('Error:', error);
      setDataLoaded(true); // Even on error, mark as loaded to show empty state
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (currentWebsites?: Website[]) => {
    if (!user) return;

    // Use provided websites or fall back to state (though state might be stale if called during render cycle, usually passed from fetchWebsites)
    const siteList = currentWebsites || websites;

    try {
      const { data: categoriesData, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      // Calculate counts based on current websites
      const categoriesWithCounts = (categoriesData || []).map((cat: { id: string; name: string }) => {
        const count = siteList.filter(w => w.category === cat.name).length;
        return {
          id: cat.id,
          name: cat.name,
          count
        };
      });

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filterWebsites = async (query?: string, forceAI?: boolean) => {
    const searchQueryToUse = query !== undefined ? query : activeSearchQuery;
    const useAI = forceAI !== undefined ? forceAI : isAIModeEnabled;
    let filtered = websites;

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'Reminders') {
        // Show pending reminders
        filtered = getPendingReminders();
      } else if (selectedCategory === 'Favorites') {
        // Show pinned websites
        filtered = filtered.filter(website => website.is_pinned);
      } else {
        filtered = filtered.filter(website => website.category === selectedCategory);
      }
    }

    // Filter by search
    if (searchQueryToUse.trim()) {
      if (useAI) {
        // AI-powered search
        setIsSearchingAI(true);
        setSearchSuggestion(null); // Clear suggestion for AI search
        try {
          console.log('Performing AI search with query:', searchQueryToUse);
          filtered = await searchWebsitesWithAI(searchQueryToUse, filtered);
          console.log('AI search results:', filtered.length);
          if (filtered.length === 0) {
            toast('No results found', { icon: 'ℹ️' });
          }
        } catch (error: unknown) {
          console.error('AI search failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'AI search failed';
          toast.error(`AI search failed: ${errorMessage}. Using text search instead.`);
          // Fallback to smart text search
          const result = smartSearch(searchQueryToUse, filtered, vocabulary);
          filtered = result.websites;
          setSearchSuggestion(result.suggestion);
        } finally {
          setIsSearchingAI(false);
        }
      } else {
        // Smart text search with fuzzy matching and spelling suggestions
        const result = smartSearch(searchQueryToUse, filtered, vocabulary);
        filtered = result.websites;
        setSearchSuggestion(result.suggestion);
      }
    } else {
      // Clear suggestion when no search query
      setSearchSuggestion(null);
    }

    setFilteredWebsites(filtered);
  };

  // Derive pinned vs other websites from the filtered list
  // If selectedCategory is 'Favorites', we don't separate them (everything is pinned/starred)
  // If selectedCategory is 'Reminders', we don't separate them
  const shouldSeparatePinned = selectedCategory !== 'Favorites' && selectedCategory !== 'Reminders' && viewMode !== 'graph';
  const hasActiveSearch = activeSearchQuery.trim().length > 0;

  const pinnedWebsites = shouldSeparatePinned && !hasActiveSearch ? filteredWebsites.filter(w => w.is_pinned) : [];
  const otherWebsites = shouldSeparatePinned && !hasActiveSearch ? filteredWebsites.filter(w => !w.is_pinned) : filteredWebsites;

  // When searching, separate matched results from non-matched
  const searchResultIds = new Set(filteredWebsites.map(w => w.id));
  const nonMatchingWebsites = hasActiveSearch && viewMode !== 'graph'
    ? websites.filter(w => !searchResultIds.has(w.id) && (selectedCategory === 'all' || w.category === selectedCategory))
    : [];


  const handleTogglePin = async (website: Website) => {
    try {
      const newPinnedStatus = !website.is_pinned;

      // Optimistic update
      setWebsites(prev => prev.map(w =>
        w.id === website.id ? { ...w, is_pinned: newPinnedStatus } : w
      ).sort((a, b) => {
        // Re-sort: Pinned first, then date
        if (a.is_pinned === b.is_pinned) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.is_pinned ? -1 : 1;
      }));

      const { error } = await supabase
        .from('websites')
        .update({ is_pinned: newPinnedStatus })
        .eq('id', website.id)
        .eq('user_id', user?.id);

      if (error) {
        // Revert on error
        fetchWebsites();
        throw error;
      }

      toast.success(newPinnedStatus ? 'Website pinned' : 'Website unpinned');
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update pin status');
    }
  };

  // Handle explicit search trigger (Enter key or search button)
  const handleSearch = useCallback(() => {
    const query = searchQuery.trim();

    if (!query) {
      setActiveSearchQuery('');
      filterWebsites('', isAIModeEnabled);
      return;
    }

    // Set active query and trigger search
    setActiveSearchQuery(query);
    filterWebsites(query, isAIModeEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isAIModeEnabled]);

  // Calculate 'Recently Added' count
  const recentlyAddedCount = websites.filter(website => website.category === 'Recently Added').length;

  const handleDeleteWebsite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Website deleted successfully');
      fetchWebsites();
      handleCategoryChange(); // Update category counts
    } catch (error: unknown) {
      toast.error('Failed to delete website');
      console.error('Error:', error);
    }
  };

  const handleViewWebsite = (website: Website) => {
    setSelectedWebsite(website);
  };

  const handleCloseDetailsModal = () => {
    setSelectedWebsite(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Successfully signed out');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  // Reminder action helpers for individual websites
  const handleReminderOpenWebsite = async (website: Website) => {
    try {
      // Open website in new tab
      window.open(website.url, '_blank');

      // Update reminder timestamp
      const { error } = await supabase
        .from('websites')
        .update({
          last_reminded_at: new Date().toISOString()
        })
        .eq('id', website.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Refresh data
      triggerRefresh();
    } catch (error: unknown) {
      console.error('Error handling reminder open:', error);
      toast.error('Failed to update reminder');
    }
  };

  const handleReminderCheckLater = async (website: Website) => {
    try {
      // Update reminder timestamp so it won't show again for a while
      const { error } = await supabase
        .from('websites')
        .update({
          last_reminded_at: new Date().toISOString()
        })
        .eq('id', website.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Refresh data
      triggerRefresh();
      toast.success('Reminder postponed');
    } catch (error: unknown) {
      console.error('Error handling check later:', error);
      toast.error('Failed to update reminder');
    }
  };

  const handleReminderDismiss = async (website: Website) => {
    try {
      // Permanently dismiss reminders for this website
      const { error } = await supabase
        .from('websites')
        .update({
          reminder_dismissed: true,
          last_reminded_at: new Date().toISOString()
        })
        .eq('id', website.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Refresh data
      triggerRefresh();
      toast.success('Reminder dismissed permanently');
    } catch (error: unknown) {
      console.error('Error handling dismiss reminder:', error);
      toast.error('Failed to dismiss reminder');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-white'
        }`}>
        <div className={`animate-spin rounded-full h-8 w-8 border-b ${isDarkMode ? 'border-[#e9e9e9]' : 'border-[#37352f]'
          }`}></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-black' : 'bg-white'
      }`}>
      {/* Header */}
      <header className={`border-b transition-all duration-300 ${isDarkMode
        ? 'bg-black border-[#2e2e2e]'
        : 'bg-white border-[#e9e9e9]'
        }`}>
        <div className="max-w-[120rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setViewMode('grid');
                }}
                className="flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="w-8 h-8 flex items-center justify-center overflow-hidden rounded">
                  <img
                    src="/logo.png"
                    alt="Memorai Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback to text if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-text')) {
                        const fallback = document.createElement('span');
                        fallback.className = `font-light text-sm fallback-text ${isDarkMode ? 'text-white' : 'text-black'
                          }`;
                        fallback.textContent = 'AB';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
                <div className="text-left">
                  <h1 className={`text-xl font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
                    }`}>Memorai</h1>
                  <p className={`hidden md:block text-xs font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                    }`}>A personal archive for curated web content</p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className={`hidden lg:block px-3 py-1.5 border rounded transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e] bg-[#191919]' : 'border-[#e9e9e9] bg-white'
                }`}>
                <span className={`text-sm font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                  }`}>
                  {(() => {
                    const hour = new Date().getHours();
                    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    const weeklyCount = websites.filter(w => new Date(w.created_at) > weekAgo).length;
                    const userName = user?.email?.split('@')[0];
                    return (
                      <>
                        {greeting}, <span className={`font-medium ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'}`}>{userName}</span>.
                        {weeklyCount > 0 && <span className={`ml-1 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'}`}>You saved {weeklyCount} link{weeklyCount !== 1 ? 's' : ''} this week.</span>}
                      </>
                    );
                  })()}
                </span>
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              <button
                onClick={handleSignOut}
                className={`flex items-center gap-2 px-2 py-1.5 border rounded transition-all duration-150 text-sm font-normal ${isDarkMode
                  ? 'text-[#787774] hover:text-[#e9e9e9] border-[#2e2e2e] hover:bg-[#2e2e2e]'
                  : 'text-[#787774] hover:text-[#37352f] border-[#e9e9e9] hover:bg-[#f1f1ef]'
                  }`}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:block">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[120rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-8 lg:self-start z-30">
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              totalWebsites={websites.length}
              onCategoryChange={handleCategoryChange}
              recentlyAddedCount={recentlyAddedCount}
              pendingRemindersCount={pendingRemindersCount}
            />

            <button
              onClick={() => setIsAddModalOpen(true)}
              className={`w-full mt-6 border rounded-lg px-2 py-1.5 text-sm font-normal transition-all duration-150 flex items-center justify-center gap-2 ${isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9] border-[#2e2e2e] hover:bg-[#3e3e3e]'
                : 'bg-[#f1f1ef] text-[#37352f] border-[#e9e9e9] hover:bg-[#e9e9e9]'
                }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Website
            </button>

            <button
              onClick={() => {
                if (websites.length === 0) {
                  toast.error('No websites to export');
                  return;
                }
                const exportData = {
                  exportedAt: new Date().toISOString(),
                  totalWebsites: websites.length,
                  websites: websites.map(w => ({
                    title: w.title,
                    url: w.url,
                    category: w.category,
                    description: w.description || '',
                    createdAt: w.created_at
                  }))
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `memorai-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success(`Exported ${websites.length} websites`);
              }}
              className={`w-full mt-2 border rounded-lg px-2 py-1.5 text-sm font-normal transition-all duration-150 flex items-center justify-center gap-2 ${isDarkMode
                ? 'text-[#787774] border-[#2e2e2e] hover:bg-[#2e2e2e] hover:text-[#e9e9e9]'
                : 'text-[#787774] border-[#e9e9e9] hover:bg-[#f1f1ef] hover:text-[#37352f]'
                }`}
            >
              <Download className="h-3.5 w-3.5" />
              Export to JSON
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search and Controls */}
            <div className={`sticky top-0 z-20 backdrop-blur-md pt-4 pb-2 mb-6 space-y-4 transition-colors duration-300 border-b ${isDarkMode ? 'bg-black/80 border-[#2e2e2e]' : 'bg-white/80 border-[#e9e9e9]'
              } -mx-2 px-2`}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                isSearchingAI={isSearchingAI}
                placeholder="Search websites..."
                suggestion={searchSuggestion}
                onSuggestionClick={(suggestion) => {
                  setSearchQuery(suggestion);
                  setActiveSearchQuery(suggestion);
                  filterWebsites(suggestion, false);
                }}
                isAIModeEnabled={isAIModeEnabled}
                onAIModeToggle={() => setIsAIModeEnabled(!isAIModeEnabled)}
              />

              {/* Simple hint section for bookmark import via the browser extension */}
              <div
                className={`mt-2 px-3 py-2 border rounded text-xs font-normal transition-colors duration-300 ${isDarkMode
                  ? 'border-[#2e2e2e] bg-[#191919] text-[#787774]'
                  : 'border-[#e9e9e9] bg-white text-[#787774]'
                  }`}
              >
                <span className="font-medium">Import Bookmarks:</span>{' '}
                Open the Memorai browser extension and click
                {' '}
                <span className={isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f] font-medium'}>
                  “Import Bookmarks”
                </span>
                {' '}
                to bring your current browser bookmarks into your dashboard under the
                {' '}
                <span className={isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f] font-medium'}>
                  Imported Bookmarks
                </span>
                {' '}
                category.
              </div>

              <div className="flex justify-between items-center">
                <div className={`px-2 py-1.5 border rounded transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e] bg-[#191919] text-[#787774]' : 'border-[#e9e9e9] bg-white text-[#787774]'
                  }`}>
                  <p className="text-sm font-normal">
                    <span className="font-medium">{filteredWebsites.length}</span> website{filteredWebsites.length !== 1 ? 's' : ''} found
                    {!dataLoaded && ' (loading...)'}
                  </p>
                </div>

                <div className={`flex items-center gap-0.5 p-1 border rounded transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e] bg-[#191919]' : 'border-[#e9e9e9] bg-white'
                  }`}>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-all duration-150 ${viewMode === 'grid'
                      ? isDarkMode
                        ? 'bg-[#2e2e2e] text-[#e9e9e9]'
                        : 'bg-[#f1f1ef] text-[#37352f]'
                      : isDarkMode
                        ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                        : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                      }`}
                    title="Grid view"
                  >
                    <Grid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-all duration-150 ${viewMode === 'list'
                      ? isDarkMode
                        ? 'bg-[#2e2e2e] text-[#e9e9e9]'
                        : 'bg-[#f1f1ef] text-[#37352f]'
                      : isDarkMode
                        ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                        : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                      }`}
                    title="List view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('graph')}
                    className={`p-2 rounded transition-all duration-150 ${viewMode === 'graph'
                      ? isDarkMode
                        ? 'bg-[#2e2e2e] text-[#e9e9e9]'
                        : 'bg-[#f1f1ef] text-[#37352f]'
                      : isDarkMode
                        ? 'text-[#787774] hover:text-[#e9e9e9] hover:bg-[#2e2e2e]'
                        : 'text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]'
                      }`}
                    title="Graph view"
                  >
                    <Network className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Websites Grid/List or Reminders Panel */}
            {loading && !dataLoaded ? (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6'
                  : 'space-y-4 overflow-hidden'
              }>
                {[...Array(8)].map((_, i) => (
                  <SkeletonCard key={i} viewMode={viewMode} />
                ))}
              </div>
            ) : selectedCategory === 'Reminders' ? (
              <RemindersPanel
                websites={filteredWebsites}
                onOpenWebsite={handleReminderOpenWebsite}
                onCheckLater={handleReminderCheckLater}
                onDismissReminder={handleReminderDismiss}
                onViewDetails={handleViewWebsite}
              />
            ) : viewMode === 'graph' ? (
              <div className="h-[600px] w-full">
                <KnowledgeGraph
                  websites={filteredWebsites}
                  onNodeClick={(website) => handleViewWebsite(website)}
                />
              </div>
            ) : filteredWebsites.length === 0 ? (
              <div className="text-center py-16">
                <Grid className={`h-12 w-12 mx-auto mb-6 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'
                  }`} />
                <h3 className={`text-2xl font-medium mb-3 transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
                  }`}>
                  {searchQuery ? 'No results found' : selectedCategory === 'Favorites' ? 'No starred websites' : 'No websites found'}
                </h3>
                <p className={`text-sm mb-8 font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                  }`}>
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : selectedCategory === 'Favorites'
                      ? 'Go star your important websites to see them here'
                      : 'Start building your personal archive!'}
                </p>
                {!searchQuery && selectedCategory !== 'Favorites' && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className={`border rounded-lg px-2 py-1.5 text-sm font-normal transition-all duration-150 ${isDarkMode
                      ? 'bg-[#2e2e2e] text-[#e9e9e9] border-[#2e2e2e] hover:bg-[#3e3e3e]'
                      : 'bg-[#f1f1ef] text-[#37352f] border-[#e9e9e9] hover:bg-[#e9e9e9]'
                      }`}
                  >
                    Add Your First Website
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8 animate-fade-in">
                {/* Search Results Section - shown when there's an active search */}
                {hasActiveSearch && filteredWebsites.length > 0 && (
                  <div>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search Results ({filteredWebsites.length})
                    </h3>
                    <div className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6'
                        : 'space-y-4 overflow-hidden'
                    }>
                      {filteredWebsites.slice(0, visibleCount).map((website) => (
                        <WebsiteCard
                          key={website.id}
                          website={website}
                          viewMode={viewMode}
                          onDelete={handleDeleteWebsite}
                          onView={handleViewWebsite}
                          onTogglePin={handleTogglePin}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Websites Section - shown when searching to show non-matching items */}
                {hasActiveSearch && nonMatchingWebsites.length > 0 && (
                  <div className={`pt-6 border-t ${isDarkMode ? 'border-[#2e2e2e]' : 'border-[#e9e9e9]'}`}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'}`}>
                      Other Websites ({nonMatchingWebsites.length})
                    </h3>
                    <div className={`${viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6'
                      : 'space-y-4 overflow-hidden'
                      } opacity-50`}>
                      {nonMatchingWebsites.slice(0, 12).map((website) => (
                        <WebsiteCard
                          key={website.id}
                          website={website}
                          viewMode={viewMode}
                          onDelete={handleDeleteWebsite}
                          onView={handleViewWebsite}
                          onTogglePin={handleTogglePin}
                        />
                      ))}
                    </div>
                    {nonMatchingWebsites.length > 12 && (
                      <p className={`text-xs mt-4 text-center ${isDarkMode ? 'text-[#787774]' : 'text-[#9b9a97]'}`}>
                        + {nonMatchingWebsites.length - 12} more websites not matching your search
                      </p>
                    )}
                  </div>
                )}

                {/* Pinned Section - shown when NOT searching */}
                {!hasActiveSearch && pinnedWebsites.length > 0 && (
                  <div>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'}`}>
                      <Star className="h-3 w-3 fill-current" />
                      Pinned
                    </h3>
                    <div className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6'
                        : 'space-y-4 overflow-hidden'
                    }>
                      {pinnedWebsites.map((website) => (
                        <WebsiteCard
                          key={website.id}
                          website={website}
                          viewMode={viewMode}
                          onDelete={handleDeleteWebsite}
                          onView={handleViewWebsite}
                          onTogglePin={handleTogglePin}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Section - shown when NOT searching */}
                {!hasActiveSearch && (
                  <div>
                    {pinnedWebsites.length > 0 && (
                      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'}`}>
                        {selectedCategory === 'all' ? 'All Websites' : selectedCategory}
                      </h3>
                    )}
                    <div className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6'
                        : 'space-y-4 overflow-hidden'
                    }>
                      {otherWebsites.slice(0, visibleCount).map((website) => (
                        <WebsiteCard
                          key={website.id}
                          website={website}
                          viewMode={viewMode}
                          onDelete={handleDeleteWebsite}
                          onView={handleViewWebsite}
                          onTogglePin={handleTogglePin}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Infinite Scroll Trigger & Loader */}
            {filteredWebsites.length > 0 && !loading && (
              <div
                ref={observerTarget}
                className="h-24 flex flex-col gap-3 items-center justify-center p-4 transition-opacity duration-300"
                style={{ opacity: visibleCount < filteredWebsites.length ? 1 : 0 }}
              >
                {visibleCount < filteredWebsites.length && (
                  <>
                    <div className={`animate-spin rounded-full h-5 w-5 border-2 border-t-transparent ${isDarkMode ? 'border-[#e9e9e9]' : 'border-[#37352f]'
                      }`}></div>
                    <span className={`text-xs font-medium italic animate-pulse ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'}`}>
                      {loadingMessage}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`border-t transition-all duration-300 ${isDarkMode
        ? 'border-[#2e2e2e] bg-black'
        : 'border-[#e9e9e9] bg-white'
        }`}>
        <div className={`max-w-[120rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center transition-colors duration-300`}>
          <div className={`inline-flex items-center gap-2 px-2 py-1.5 border rounded transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e] bg-[#191919] text-[#787774]' : 'border-[#e9e9e9] bg-white text-[#787774]'
            }`}>
            <span className="text-sm font-normal">Made with</span>
            <span className="text-red-500 text-lg animate-pulse">❤</span>
            <span className="text-sm font-normal">by</span>
            <span className="text-sm font-medium">Ameya Bhagat</span>
          </div>
        </div>
      </footer>

      {/* Add Website Modal */}
      <AddWebsiteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchWebsites}
        categories={categories.map(c => c.name)}
      />

      {/* Website Details Modal */}
      {selectedWebsite && (
        <WebsiteDetailsModal
          website={selectedWebsite}
          isOpen={!!selectedWebsite}
          onClose={handleCloseDetailsModal}
          onUpdate={fetchWebsites}
          categories={categories.map(c => c.name)}
          allWebsites={websites}
          onViewRelated={(relatedWebsite) => setSelectedWebsite(relatedWebsite)}
        />
      )}
    </div>
  );
};

export default Dashboard;