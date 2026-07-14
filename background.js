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

// Install handler
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