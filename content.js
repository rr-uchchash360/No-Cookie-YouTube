// Global variable to track indicator timeout
let indicatorTimeout = null;

// Listen for extension messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'redirectStatusChanged') {
    // When status changes, check if we should show indicator
    chrome.storage.local.get(['showIndicator'], (result) => {
      const showIndicator = result.showIndicator !== false;
      if (showIndicator) {
        updateRedirectState(message.enabled);
      }
    });
  }
  sendResponse({ received: true });
  return true;
});

// Get initial state
chrome.storage.local.get(['enabled', 'showIndicator'], (result) => {
  const isEnabled = result.enabled !== false;
  const showIndicator = result.showIndicator !== false;
  
  // Only show indicator if setting is enabled
  if (showIndicator) {
    updateRedirectState(isEnabled);
  }
  
  // If enabled and on YouTube, try redirect
  if (isEnabled && window.location.hostname.includes('youtube.com')) {
    attemptRedirect();
  }
});

function updateRedirectState(enabled) {
  // Clear any existing timeout
  if (indicatorTimeout) {
    clearTimeout(indicatorTimeout);
    indicatorTimeout = null;
  }
  
  // Remove any existing indicators first
  const existingIndicator = document.getElementById('redirect-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Create indicator based on state
  const indicator = document.createElement('div');
  indicator.id = 'redirect-indicator';
  
  if (enabled) {
    // Green indicator for active redirect
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 5px;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    indicator.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
        <path d="M10.73,1.27a1,1,0,0,0-1.41,0L4.5,5.59,2.71,3.79A1,1,0,0,0,1.29,5.21l2.5,2.5a1,1,0,0,0,1.41,0l5.5-5.5A1,1,0,0,0,10.73,1.27Z"/>
      </svg>
      No Cookie YouTube: Active
    `;
  } else {
    // Red indicator for disabled redirect
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #ff4444;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 5px;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    indicator.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
        <path d="M8.5,6l2.5-2.5c0.2-0.2,0.2-0.5,0-0.7l-1-1C9.8,1.6,9.6,1.6,9.5,1.8L7,4.3L4.5,1.8C4.4,1.6,4.2,1.6,4,1.8l-1,1
          C2.8,3,2.8,3.2,3,3.4L5.5,6L3,8.5C2.8,8.6,2.8,8.8,3,9l1,1C4.2,10.2,4.4,10.2,4.5,10L7,7.5l2.5,2.5c0.2,0.2,0.5,0.2,0.7,0l1-1
          c0.2-0.2,0.2-0.5,0-0.7L8.5,6z"/>
      </svg>
      No Cookie YouTube: Inactive
    `;
  }
  
  // Function to append indicator to DOM
  const appendIndicator = () => {
    if (document.body) {
      document.body.appendChild(indicator);
      
      // Start fade out after 2.7 seconds
      indicatorTimeout = setTimeout(() => {
        if (indicator.parentNode && indicator.style.opacity === '1') {
          indicator.style.opacity = '0';
        }
      }, 2700);
      
      // Remove from DOM after 3 seconds
      indicatorTimeout = setTimeout(() => {
        if (indicator.parentNode) {
          indicator.remove();
        }
        indicatorTimeout = null;
      }, 3000);
    }
  };
  
  // Append to DOM based on current state
  if (document.readyState === 'loading') {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', appendIndicator);
  } else {
    // DOM is already ready
    appendIndicator();
  }
}

// Fallback redirect function
function attemptRedirect() {
  const currentUrl = window.location.href;
  
  // Check if this is a YouTube video page or shorts
  const isVideoPage = currentUrl.includes('/watch') || currentUrl.includes('/shorts/');
  const isYouTubeDomain = currentUrl.includes('youtube.com');
  const isAlreadyRedirected = currentUrl.includes('yout-ube.com');
  
  if (isVideoPage && isYouTubeDomain && !isAlreadyRedirected) {
    try {
      const newUrl = currentUrl.replace('youtube.com', 'yout-ube.com');
      console.log('Redirecting to:', newUrl);
      
      // Use replace to avoid adding to history
      setTimeout(() => {
        window.location.replace(newUrl);
      }, 100);
    } catch (error) {
      console.error('Redirect failed:', error);
    }
  }
}

// Clean up before page unload (important for redirects)
window.addEventListener('beforeunload', () => {
  if (indicatorTimeout) {
    clearTimeout(indicatorTimeout);
    indicatorTimeout = null;
  }
  
  const existingIndicator = document.getElementById('redirect-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
});

// Monitor URL changes for Single Page Applications (like YouTube)
function setupUrlChangeObserver() {
  let lastUrl = location.href;
  
  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      
      // Check if we should redirect
      chrome.storage.local.get(['enabled'], (result) => {
        if (result.enabled !== false) {
          // Small delay to ensure page is ready
          setTimeout(attemptRedirect, 100);
        }
      });
    }
  });
  
  // Start observing
  observer.observe(document, {
    subtree: true,
    childList: true
  });
}

// Initialize when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupUrlChangeObserver();
  });
} else {
  setupUrlChangeObserver();
}

// Also run redirect on page load
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['enabled'], (result) => {
    if (result.enabled !== false) {
      attemptRedirect();
    }
  });
});