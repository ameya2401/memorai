// Configuration and state management
let config = {
  dashboardUrl: null,
  userEmail: null,
  userPassword: null,
  userId: null,
  extensionSecret: null
};

// Load configuration from storage
async function loadConfig() {
  const result = await chrome.storage.sync.get(['dashboardUrl', 'userEmail', 'userPassword', 'userId', 'extensionSecret']);
  config = {
    dashboardUrl: result.dashboardUrl || null,
    userEmail: result.userEmail || null,
    userPassword: result.userPassword || null,
    userId: result.userId || null,
    extensionSecret: result.extensionSecret || null
  };

  return config.dashboardUrl && config.userEmail && config.userPassword;
}

// Save configuration to storage
async function saveConfig() {
  await chrome.storage.sync.set(config);
}

// Get current tab information
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Get favicon URL
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

// Fetches all bookmarks from the browser and flattens them into a simple list.
// Only leaf nodes with a URL are returned.
async function fetchAllBookmarks() {
  return new Promise((resolve) => {
    try {
      chrome.bookmarks.getTree((tree) => {
        const results = [];

        function walk(nodes) {
          for (const node of nodes) {
            if (node.url) {
              // Leaf node: this is an actual bookmark
              results.push({
                id: node.id,
                title: node.title || node.url,
                url: node.url,
              });
            } else if (node.children && node.children.length > 0) {
              // Folder: recurse into children
              walk(node.children);
            }
          }
        }

        walk(tree);
        resolve(results);
      });
    } catch (error) {
      console.error('Failed to read bookmarks:', error);
      resolve([]);
    }
  });
}

// Keep bookmarks in memory between "Import" and "Confirm"
let fetchedBookmarks = [];

// Renders a very simple text preview into #bookmarksPreview.
// For V1 we just show title + URL and maybe limit number.
function renderBookmarksPreview(bookmarks) {
  const container = document.getElementById('bookmarksPreview');
  if (!container) return;

  container.innerHTML = '';

  if (!bookmarks.length) {
    container.textContent = 'No bookmarks found.';
    return;
  }

  const maxToShow = 50; // keep UI light; still importing all on confirm
  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';

  bookmarks.slice(0, maxToShow).forEach((bm) => {
    const li = document.createElement('li');
    li.style.marginBottom = '6px';

    // Title in bold, URL on next line, both readable
    const titleEl = document.createElement('div');
    titleEl.style.fontWeight = '500';
    titleEl.style.fontSize = '12px';
    titleEl.textContent = bm.title;

    const urlEl = document.createElement('div');
    urlEl.style.fontSize = '11px';
    urlEl.style.color = '#9aa0a6';
    urlEl.textContent = bm.url;

    li.appendChild(titleEl);
    li.appendChild(urlEl);

    list.appendChild(li);
  });

  container.appendChild(list);

  if (bookmarks.length > maxToShow) {
    const info = document.createElement('div');
    info.style.marginTop = '4px';
    info.textContent = `Showing first ${maxToShow} of ${bookmarks.length} bookmarks. All will be imported.`;
    container.appendChild(info);
  }
}

// Show status message
function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

// Auto-categorize based on URL (simplified - always returns 'Recently Added')
function autoCategorize(url) {
  // Always return 'Recently Added' for the temporary fix
  return 'Recently Added';
}

// Fetch categories from API
async function fetchCategories() {
  try {
    const userId = config.userId || await authenticateUser();
    const response = await fetch(`${config.dashboardUrl}/api/categories?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

// Populate category dropdown
async function populateCategoryDropdown() {
  const selectEl = document.getElementById('categorySelect');
  const newCatContainer = document.getElementById('newCategoryContainer');

  if (!selectEl) return;

  try {
    const categories = await fetchCategories();

    selectEl.innerHTML = '';

    // Add default option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = 'Recently Added';
    defaultOpt.textContent = '📝 Recently Added';
    selectEl.appendChild(defaultOpt);

    // Add existing categories
    categories.forEach(cat => {
      if (cat.name !== 'Recently Added') {
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        selectEl.appendChild(opt);
      }
    });

    // Add "Create New" option
    const createOpt = document.createElement('option');
    createOpt.value = '__create_new__';
    createOpt.textContent = '➕ Create New Category';
    selectEl.appendChild(createOpt);

    // Handle change event
    selectEl.addEventListener('change', () => {
      if (selectEl.value === '__create_new__') {
        newCatContainer.style.display = 'block';
        document.getElementById('newCategoryInput')?.focus();
      } else {
        newCatContainer.style.display = 'none';
      }
    });

  } catch (error) {
    console.error('Failed to populate categories:', error);
    selectEl.innerHTML = '<option value="Recently Added">📝 Recently Added</option>';
  }
}

// Authenticate user and get user ID
async function authenticateUser() {
  if (config.userId) {
    return config.userId; // Already have user ID
  }

  try {
    const response = await fetch(`${config.dashboardUrl}/api/auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.extensionSecret ? { 'x-extension-secret': config.extensionSecret } : {})
      },
      body: JSON.stringify({
        email: config.userEmail,
        password: config.userPassword
      })
    });

    if (!response.ok) {
      let errorText = 'Authentication failed';
      try {
        const errorData = await response.json();
        errorText = errorData.error || errorText;
      } catch {
        errorText = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorText);
    }

    const result = await response.json();
    if (result.success && result.user) {
      config.userId = result.user.id;
      await saveConfig(); // Save the user ID for future use
      return config.userId;
    } else {
      throw new Error('Invalid authentication response');
    }
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}


// Save tab to database via API
async function saveTabToDatabase(tabData) {
  try {
    // First authenticate to get user ID
    const userId = await authenticateUser();

    const response = await fetch(`${config.dashboardUrl}/api/save-tab`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.extensionSecret ? { 'x-extension-secret': config.extensionSecret } : {})
      },
      body: JSON.stringify({
        ...tabData,
        userId: userId,
        userEmail: config.userEmail
      })
    });

    if (!response.ok) {
      let errorText = 'Failed to save';
      try {
        const errorData = await response.json();
        errorText = errorData.error || errorText;
      } catch {
        errorText = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorText);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to save tab:', error);
    throw error;
  }
}

// Apply dark mode class
function applyDarkMode() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (isDarkMode) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  // Listen for changes
  if (window.matchMedia) {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', applyDarkMode);
  }
}

// Initialize popup
async function initPopup() {
  // Apply dark mode first
  applyDarkMode();

  const isConfigured = await loadConfig();

  if (!isConfigured) {
    document.getElementById('saveSection').style.display = 'none';
    document.getElementById('configSection').style.display = 'block';

    // Load saved values if they exist
    if (config.dashboardUrl) {
      document.getElementById('dashboardUrl').value = config.dashboardUrl;
    }
    if (config.userEmail) {
      document.getElementById('userEmail').value = config.userEmail;
    }
    if (config.userPassword) {
      document.getElementById('userPassword').value = config.userPassword;
    }
    if (config.extensionSecret) {
      document.getElementById('extensionSecret').value = config.extensionSecret;
    }

    return;
  }

  // Load current tab information
  try {
    const tab = await getCurrentTab();

    // Set tab title (editable)
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = tab.title || 'Untitled';
    titleInput.className = 'tab-title-input';
    titleInput.style.cssText = `
      width: 100%;
      border: none;
      background: transparent;
      font-size: 13px;
      font-weight: 400;
      padding: 2px 0;
      margin-bottom: 2px;
      outline: none;
      font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    // Apply color based on dark mode - check if body has dark class
    const updateTitleColor = () => {
      titleInput.style.color = '#e8eaed';
    };

    // Set initial color
    updateTitleColor();

    // Update color when dark mode changes
    const observer = new MutationObserver(updateTitleColor);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const titleElement = document.getElementById('tabTitle');
    titleElement.innerHTML = '';
    titleElement.style.minHeight = '20px';
    titleElement.appendChild(titleInput);

    // Set tab URL (display only)
    document.getElementById('tabUrl').textContent = tab.url;

    // Set favicon
    const favicon = getFaviconUrl(tab.url);
    if (favicon) {
      const favEl = document.getElementById('tabFavicon');
      favEl.addEventListener('error', () => { favEl.style.display = 'none'; }, { once: true });
      favEl.src = favicon;
    }

  } catch (error) {
    console.error('Failed to load tab info:', error);
    showStatus('Failed to load tab information', 'error');
  }

  // Populate category dropdown
  await populateCategoryDropdown();

  // Wire up bookmark import controls after base UI is ready
  const importBtn = document.getElementById('importBookmarks');
  const confirmBtn = document.getElementById('confirmImport');
  const confirmContainer = document.getElementById('confirmImportContainer');
  const previewContainer = document.getElementById('bookmarksPreview');

  if (importBtn && confirmBtn && previewContainer) {
    importBtn.addEventListener('click', async () => {
      importBtn.disabled = true;
      const originalText = importBtn.textContent;
      importBtn.textContent = 'Fetching bookmarks...';

      try {
        fetchedBookmarks = await fetchAllBookmarks();
        renderBookmarksPreview(fetchedBookmarks);

        previewContainer.style.display = 'block';
        if (confirmContainer) {
          confirmContainer.style.display = fetchedBookmarks.length ? 'block' : 'none';
        } else {
          confirmBtn.style.display = fetchedBookmarks.length ? 'block' : 'none';
        }
      } catch (err) {
        console.error('Failed to fetch bookmarks:', err);
        showStatus('Failed to fetch bookmarks', 'error');
      } finally {
        importBtn.disabled = false;
        importBtn.textContent = originalText;
      }
    });

    confirmBtn.addEventListener('click', async () => {
      if (!fetchedBookmarks.length) return;

      confirmBtn.disabled = true;
      const originalText = confirmBtn.textContent;
      confirmBtn.textContent = 'Importing...';

      try {
        // Reuse existing authentication helper to get user ID
        const userId = await authenticateUser();

        const response = await fetch(`${config.dashboardUrl}/api/import-bookmarks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.extensionSecret ? { 'x-extension-secret': config.extensionSecret } : {}),
          },
          body: JSON.stringify({
            userId,
            bookmarks: fetchedBookmarks.map((bm) => ({
              title: bm.title,
              url: bm.url,
            })),
          }),
        });

        if (!response.ok) {
          let errorText = 'Import failed';
          try {
            const errorData = await response.json();
            errorText = errorData.error || errorText;
          } catch {
            errorText = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorText);
        }

        showStatus('Bookmarks imported successfully!', 'success');

        // Clear preview and state
        fetchedBookmarks = [];
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
        if (confirmContainer) {
          confirmContainer.style.display = 'none';
        } else {
          confirmBtn.style.display = 'none';
        }
      } catch (err) {
        console.error('Import failed:', err);
        showStatus(`Import failed: ${err.message}`, 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
      }
    });
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', initPopup);

// Save configuration
document.getElementById('saveConfig')?.addEventListener('click', async () => {
  const dashboardUrl = document.getElementById('dashboardUrl').value.trim();
  const userEmail = document.getElementById('userEmail').value.trim();
  const userPassword = document.getElementById('userPassword').value.trim();
  const extensionSecret = document.getElementById('extensionSecret')?.value?.trim() || null;

  if (!dashboardUrl) {
    showStatus('Please enter a dashboard URL', 'error');
    return;
  }
  if (!userEmail) {
    showStatus('Please enter your account email', 'error');
    return;
  }
  if (!userPassword) {
    showStatus('Please enter your account password', 'error');
    return;
  }

  // Validate URL
  try {
    new URL(dashboardUrl);
  } catch {
    showStatus('Please enter a valid URL', 'error');
    return;
  }

  // Validate email
  if (!userEmail.includes('@')) {
    showStatus('Please enter a valid email', 'error');
    return;
  }

  config.dashboardUrl = dashboardUrl;
  config.userEmail = userEmail;
  config.userPassword = userPassword;
  config.userId = null; // Reset user ID so it gets fetched fresh
  config.extensionSecret = extensionSecret;

  await saveConfig();
  showStatus('Configuration saved!', 'success');

  // Reload popup to show save section
  setTimeout(() => {
    window.location.reload();
  }, 1500);
});

// Open dashboard
document.getElementById('openDashboard')?.addEventListener('click', () => {
  if (config.dashboardUrl) {
    chrome.tabs.create({ url: config.dashboardUrl });
  }
});

// Save tab
document.getElementById('saveTab')?.addEventListener('click', async () => {
  const saveBtn = document.getElementById('saveTab');
  const originalText = saveBtn.innerHTML;

  try {
    // Show loading state
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="loading"></div> Saving...';

    const tab = await getCurrentTab();
    const titleInput = document.querySelector('.tab-title-input');
    const description = document.getElementById('description').value.trim();

    // Get selected category or new category
    const categorySelect = document.getElementById('categorySelect');
    const newCategoryInput = document.getElementById('newCategoryInput');
    let category = 'Recently Added';

    if (categorySelect) {
      if (categorySelect.value === '__create_new__' && newCategoryInput) {
        category = newCategoryInput.value.trim() || 'Recently Added';
      } else if (categorySelect.value && categorySelect.value !== '__loading__') {
        category = categorySelect.value;
      }
    }

    const tabData = {
      url: tab.url,
      title: titleInput ? titleInput.value.trim() : (tab.title || 'Untitled'),
      category: category,
      description: description || null,
      favicon: getFaviconUrl(tab.url),
      created_at: new Date().toISOString()
    };

    // Validate required fields
    if (!tabData.title.trim()) {
      throw new Error('Title cannot be empty');
    }

    await saveTabToDatabase(tabData);

    // Show success state
    saveBtn.innerHTML = '<span class="saved-icon">✓</span> Saved to Dashboard!';
    saveBtn.classList.add('btn-primary');
    saveBtn.style.background = '#8ab4f8';
    saveBtn.style.borderColor = '#8ab4f8';
    saveBtn.style.color = '#121212';

    showStatus('Website saved successfully! Check your dashboard to see it.', 'success');

    // Reset form
    document.getElementById('description').value = '';

    // Reset button after delay
    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
      saveBtn.style.background = '';
      saveBtn.style.borderColor = '';
      saveBtn.style.color = '';
      saveBtn.classList.remove('btn-primary');
    }, 2000);

  } catch (error) {
    console.error('Save failed:', error);
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
    showStatus(`Failed to save: ${error.message}`, 'error');
  }
});

// Auto-resize popup based on content
function resizePopup() {
  const body = document.body;
  const height = body.scrollHeight;
  document.body.style.height = `${Math.min(height, 600)}px`;
}

// Call resize after content loads
setTimeout(resizePopup, 100);