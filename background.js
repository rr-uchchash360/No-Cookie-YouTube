// Function to get extension version
function getExtensionVersion() {
  try {
    return chrome.runtime.getManifest().version;
  } catch (error) {
    console.error('Failed to get extension version:', error);
    return '0.0.0'; // Fallback version
  }
}

// State management
let isEnabled = true;
let settings = {
  theme: 'system',
  redirectDelay: 100,
  showIndicator: true,
  autoRefresh: true,
  playbackMode: 'current-tab'
};

// Initialize
chrome.storage.local.get(['enabled', 'theme', 'redirectDelay', 'showIndicator', 'autoRefresh', 'playbackMode'], (result) => {
  isEnabled = result.enabled !== false;
  settings = {
    theme: result.theme || 'system',
    redirectDelay: result.redirectDelay || 100,
    showIndicator: result.showIndicator !== false,
    autoRefresh: result.autoRefresh !== false,
    playbackMode: result.playbackMode || 'current-tab'
  };
  
  console.log('Extension loaded, enabled:', isEnabled);
  console.log('Settings:', settings);
  updateIcon();
  updateRules();
});

// Toggle functionality
async function updateRules() {
  try {
    if (isEnabled) {
      // ENABLE the redirect rules
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ["ruleset_1"],
        disableRulesetIds: []
      });
      console.log('No Cookie ENABLED');
    } else {
      // DISABLE the redirect rules
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [],
        disableRulesetIds: ["ruleset_1"]
      });
      console.log('No Cookie DISABLED');
    }
  } catch (error) {
    console.error('Error updating rules:', error);
  }
}

// Update icon based on state
function updateIcon() {
  const suffix = isEnabled ? '' : '-disabled';
  const iconPaths = {
    16: `icons/icon16${suffix}.png`,
    48: `icons/icon48${suffix}.png`,
    128: `icons/icon128${suffix}.png`
  };
  
  // Set icon for the action
  chrome.action.setIcon({
    path: iconPaths
  });
  
  // Set title
  chrome.action.setTitle({
    title: `No Cookie YouTube ${isEnabled ? '(Enabled)' : '(Disabled)'}`
  });
  
  // Also update for all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.action.setIcon({
          tabId: tab.id,
          path: iconPaths
        });
      }
    });
  });
}

// Handle messages from popup and options
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'toggle':
      isEnabled = request.enabled;
      chrome.storage.local.set({ enabled: isEnabled });
      updateIcon();
      updateRules();
      
      // Auto-refresh YouTube tabs if enabled
      if (settings.autoRefresh) {
        chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.reload(tab.id);
            }
          });
        });
      } else {
        // Just send status update
        chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'redirectStatusChanged',
                enabled: isEnabled 
              }).catch(() => {
                // Ignore errors
              });
            }
          });
        });
      }
      
      sendResponse({ success: true });
      break;
      
    case 'getStatus':
      sendResponse({ 
        enabled: isEnabled,
        settings: settings,
        version: getExtensionVersion() // Add version to response
      });
      break;
      
    case 'getSettings':
      sendResponse({ 
        settings: settings,
        version: getExtensionVersion() // Add version to response
      });
      break;
      
    case 'testRedirect':
      chrome.tabs.create({
        url: 'https://www.youtube.com/watch?v=Dai9lZ4Sne0',
        active: true
      });
      sendResponse({ success: true });
      break;
      
    case 'refreshPage':
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
      sendResponse({ success: true });
      break;
      
    case 'openOptions':
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      break;
      
    case 'updateSettings':
      Object.keys(request.settings).forEach(key => {
        settings[key] = request.settings[key];
      });
      chrome.storage.local.set(request.settings);
      sendResponse({ success: true });
      break;
      
    case 'openNewTab':
      chrome.tabs.create({ url: request.url, active: true });
      sendResponse({ success: true });
      break;

    case 'resetAll':
      // Reset all settings
      settings = {
        theme: 'system',
        redirectDelay: 100,
        showIndicator: true,
        autoRefresh: true,
        playbackMode: 'current-tab'
      };
      isEnabled = true;
      chrome.storage.local.clear(() => {
        chrome.storage.local.set({
          enabled: true,
          ...settings
        });
        updateIcon();
        updateRules();
      });
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return true; // Keep message channel open for async response
});

// ─── Update Checking ─────────────────────────────────────────────

function compareVersions(v1, v2) {
  const a = v1.split('.').map(Number);
  const b = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const va = a[i] || 0;
    const vb = b[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

function getAssetUrl(data) {
  if (data.assets && data.assets.length) {
    const zip = data.assets.find(a => a.name === 'No-Cookie-YouTube.zip');
    if (zip) return zip.browser_download_url;
    return data.assets[0].browser_download_url;
  }
  return `https://github.com/rr-uchchash360/No-Cookie-YouTube/releases/download/${data.tag_name}/No-Cookie-YouTube.zip`;
}

async function checkForUpdates() {
  try {
    const res = await fetch('https://api.github.com/repos/rr-uchchash360/No-Cookie-YouTube/releases/latest', { cache: 'no-cache' });
    if (!res.ok) return;

    const data = await res.json();
    const latest = data.tag_name.replace(/^v/, '');
    const current = chrome.runtime.getManifest().version;

    if (compareVersions(latest, current) > 0) {
      await chrome.storage.local.set({
        updateAvailable: true,
        latestVersion: latest,
        downloadUrl: getAssetUrl(data),
        releaseNotes: (data.body || '').substring(0, 500)
      });
      chrome.action.setBadgeText({ text: 'NEW' });
      chrome.action.setBadgeBackgroundColor({ color: '#ff3333' });
    } else {
      await chrome.storage.local.remove(['updateAvailable', 'latestVersion', 'downloadUrl', 'releaseNotes']);
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.error('Update check failed:', err);
  }
}

// Install / update handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    const defaultSettings = {
      enabled: true,
      theme: 'system',
      redirectDelay: 100,
      showIndicator: true,
      autoRefresh: true,
      playbackMode: 'current-tab'
    };
    
    chrome.storage.local.set(defaultSettings);
    settings = defaultSettings;
    console.log('Extension installed with default settings');
  }

  // Create context menu items
  chrome.contextMenus.create({
    id: 'play-nocookie',
    title: 'Play in No Cookie Player',
    contexts: ['link'],
    targetUrlPatterns: ['*://*.youtube.com/watch*', '*://*.youtube.com/shorts/*']
  });
  chrome.contextMenus.create({
    id: 'toggle-nocookie',
    title: 'Toggle No Cookie Mode',
    contexts: ['all']
  });

  // Set up daily update check
  chrome.alarms.create('checkUpdates', { periodInMinutes: 1440 });
  checkForUpdates();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkUpdates') checkForUpdates();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let key in changes) {
    if (settings.hasOwnProperty(key)) {
      settings[key] = changes[key].newValue;
    }
    if (key === 'enabled') {
      isEnabled = changes[key].newValue !== false;
      updateIcon();
    }
  }
});

// Listen for tab updates to update icon for specific tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && tab.url.includes('youtube.com')) {
    const suffix = isEnabled ? '' : '-disabled';
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        "16": `icons/icon16${suffix}.png`,
        "48": `icons/icon48${suffix}.png`,
        "128": `icons/icon128${suffix}.png`
      }
    });
  }
});

// ─── Keyboard Shortcuts ──────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'toggle-extension':
      isEnabled = !isEnabled;
      chrome.storage.local.set({ enabled: isEnabled });
      updateIcon();
      updateRules();
      if (settings.autoRefresh) {
        chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
          tabs.forEach(t => { if (t.id) chrome.tabs.reload(t.id); });
        });
      }
      break;
    case 'check-updates':
      checkForUpdates();
      break;
  }
});

// ─── Context Menu ────────────────────────────────────────────────

function getVideoIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2].split('?')[0].split('#')[0];
    return u.searchParams.get('v');
  } catch {
    return null;
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'play-nocookie': {
      const videoId = getVideoIdFromUrl(info.linkUrl) || getVideoIdFromUrl(tab.url);
      if (videoId) {
        const wasDisabled = !isEnabled;

        if (wasDisabled) {
          chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: ["ruleset_1"],
            disableRulesetIds: []
          });
        }

        chrome.tabs.create(
          { url: chrome.runtime.getURL(`player/player.html?v=${videoId}`), active: true },
          (createdTab) => {
            if (wasDisabled && createdTab?.id) {
              const onRemoved = (closedTabId) => {
                if (closedTabId === createdTab.id) {
                  chrome.tabs.onRemoved.removeListener(onRemoved);
                  chrome.storage.local.get(['enabled'], (result) => {
                    if (result.enabled === false) {
                      chrome.declarativeNetRequest.updateEnabledRulesets({
                        enableRulesetIds: [],
                        disableRulesetIds: ["ruleset_1"]
                      });
                    }
                  });
                }
              };
              chrome.tabs.onRemoved.addListener(onRemoved);
            }
          }
        );
      }
      break;
    }
    case 'toggle-nocookie': {
      isEnabled = !isEnabled;
      chrome.storage.local.set({ enabled: isEnabled });
      updateIcon();
      updateRules();
      if (settings.autoRefresh) {
        chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
          tabs.forEach(t => { if (t.id) chrome.tabs.reload(t.id); });
        });
      }
      break;
    }
  }
});