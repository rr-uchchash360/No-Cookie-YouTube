document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const mainMenu = document.getElementById('mainMenu');
  const settingsMenu = document.getElementById('settingsMenu');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusDescription = document.getElementById('statusDescription');
  const testBtn = document.getElementById('testBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const githubAttribution = document.getElementById('githubAttribution');
  
  // Current state
  let isEnabled = false;
  let isLoading = true;
  let currentTheme = 'system';
  let optionsContentLoaded = false;
  let extensionVersion = '0.0.0';
  
  // Store settings HTML content
  let settingsHTMLContent = null;
  
  // Initialize
  initialize();
  
  async function initialize() {
    try {
      showLoading();
      extensionVersion = await getExtensionVersion();
      
      const response = await sendMessage({ action: 'getStatus' });
      isEnabled = response.enabled;
      currentTheme = response.settings?.theme || 'system';
      
      applyTheme(currentTheme);
      updateUI();
      initFeaturesToggle();
      isLoading = false;
    } catch (error) {
      console.error('Failed to initialize:', error);
      showError('Failed to connect to extension');
    }
  }
  
  function applyTheme(theme) {
    document.body.className = '';
    document.body.classList.add(`theme-${theme}`);
    
    if (theme === 'dark' || (theme === 'system' && isDarkMode())) {
      setDarkTheme();
    } else if (theme === 'light' || (theme === 'system' && !isDarkMode())) {
      setLightTheme();
    }
  }
  
  function setDarkTheme() {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', '#0f0f0f');
    root.style.setProperty('--bg-secondary', '#212121');
    root.style.setProperty('--bg-tertiary', '#2c2c2c');
    root.style.setProperty('--border-color', '#3f3f3f');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#aaaaaa');
    root.style.setProperty('--text-tertiary', '#717171');
  }
  
  function setLightTheme() {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', '#ffffff');
    root.style.setProperty('--bg-secondary', '#f8f9fa');
    root.style.setProperty('--bg-tertiary', '#e9ecef');
    root.style.setProperty('--border-color', '#dee2e6');
    root.style.setProperty('--text-primary', '#212529');
    root.style.setProperty('--text-secondary', '#6c757d');
    root.style.setProperty('--text-tertiary', '#adb5bd');
  }
  
  function isDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  function showLoading() {
    statusIndicator.innerHTML = `
      <div class="youtube-loading">
        <div class="youtube-loading-dot"></div>
        <div class="youtube-loading-dot"></div>
        <div class="youtube-loading-dot"></div>
      </div>
    `;
  }
  
  function updateUI() {
    toggleSwitch.checked = isEnabled;
    toggleSwitch.disabled = false;
    
    if (isEnabled) {
      statusIndicator.classList.remove('status-inactive');
      statusIndicator.classList.add('status-active');
      statusIndicator.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">ACTIVE</span>
      `;
      statusDescription.textContent = 'You are enjoying cookie-free YouTube';
    } else {
      statusIndicator.classList.remove('status-active');
      statusIndicator.classList.add('status-inactive');
      statusIndicator.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">INACTIVE</span>
      `;
      statusDescription.textContent = 'No cookie mode is currently disabled';
    }
  }
  
  async function loadOptionsPage() {
    // If we already have the HTML content cached, use it
    if (settingsHTMLContent && optionsContentLoaded) {
      settingsMenu.innerHTML = settingsHTMLContent;
      await initializeSettingsPage();
      return;
    }
    
    try {
      // Fetch settings.html content
      const response = await fetch('settings.html');
      settingsHTMLContent = await response.text();
      
      // Load into settings menu
      settingsMenu.innerHTML = settingsHTMLContent;
      
      // Initialize settings functionality
      await initializeSettingsPage();
      
      optionsContentLoaded = true;
    } catch (error) {
      console.error('Failed to load settings page:', error);
      showSnackbar('Failed to load settings. Please try again.', 'error');
      // If settings fail to load, go back to main menu
      showMainMenu();
    }
  }
  
  async function initializeSettingsPage() {
    // Add back button handler
    const settingsBackBtn = document.getElementById('settingsBackBtn');
    if (settingsBackBtn) {
      // Remove any existing event listeners first
      settingsBackBtn.replaceWith(settingsBackBtn.cloneNode(true));
      const newBackBtn = document.getElementById('settingsBackBtn');
      
      newBackBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        showMainMenu();
      });
    }
    
    // Load current settings
    const response = await sendMessage({ action: 'getStatus' });
    const settings = response.settings || {};
    
    // Update theme UI
    const theme = settings.theme || 'system';
    updateThemeUI(theme);

    // Update playback mode UI
    const playbackMode = settings.playbackMode || 'current-tab';
    updatePlaybackModeUI(playbackMode);
    
    // Update other inputs
    const redirectDelayInput = document.getElementById('redirectDelay');
    const showIndicatorCheckbox = document.getElementById('showIndicator');
    const autoRefreshCheckbox = document.getElementById('autoRefresh');
    const infoContent = document.getElementById('infoContent');
    
    if (redirectDelayInput) redirectDelayInput.value = settings.redirectDelay || 100;
    if (showIndicatorCheckbox) showIndicatorCheckbox.checked = settings.showIndicator !== false;
    if (autoRefreshCheckbox) autoRefreshCheckbox.checked = settings.autoRefresh !== false;
    
    // Populate info section with clickable Bangladesh flag
    if (infoContent) {
      infoContent.innerHTML = `
        <p><strong>Version:</strong> ${extensionVersion}</p>
        <p><strong>Author:</strong> <a href="https://github.com/rr-uchchash360" target="_blank">Md. Rafiur Rahman (rr-uchchash360)</a> 
          <span class="flag-tooltip">
            <svg class="svg-flag" id="bdFlag" viewBox="0 0 100 60">
              <rect width="100" height="60" fill="#006A4E"/>
              <circle cx="45" cy="30" r="20" fill="#F42A41"/>
            </svg>
          </span>
        </p>
        <p><strong>Privacy:</strong> This extension does not collect any user data.</p>
      `;
      
      // Click event listener for the flag
      const bdFlag = document.getElementById('bdFlag');
      if (bdFlag) {
        bdFlag.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // Open Bangladesh Wikipedia page
          chrome.tabs.create({
            url: 'https://en.wikipedia.org/wiki/Bangladesh',
            active: true
          });
          
          // Show feedback
          showSnackbar('Opening Bangladesh Wikipedia page...', 'info');
        });
        
        // Add keyboard accessibility
        bdFlag.setAttribute('role', 'button');
        bdFlag.setAttribute('tabindex', '0');
        bdFlag.setAttribute('aria-label', 'Learn about Bangladesh');
        
        bdFlag.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
          }
        });
      }
    }
    
    // Theme selection
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
      // Clone and replace to remove old listeners
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
      
      newCard.addEventListener('click', async function() {
        const theme = this.dataset.theme;
        await saveSetting('theme', theme);
        updateThemeUI(theme);
        applyTheme(theme);
        showSnackbar(`Theme changed to ${theme}`);
      });
    });
    
    // Playback mode selection
    const playbackCards = document.querySelectorAll('.playback-card');
    playbackCards.forEach(card => {
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);

      newCard.addEventListener('click', async function() {
        const mode = this.dataset.playback;
        await saveSetting('playbackMode', mode);
        updatePlaybackModeUI(mode);
        showSnackbar(`Playback mode changed to ${getPlaybackModeLabel(mode)}`);
      });
    });

    // Redirect delay input
    if (redirectDelayInput) {
      const newInput = redirectDelayInput.cloneNode(true);
      redirectDelayInput.parentNode.replaceChild(newInput, redirectDelayInput);
      
      newInput.addEventListener('change', async function() {
        const value = parseInt(this.value) || 100;
        this.value = Math.max(0, Math.min(5000, value));
        await saveSetting('redirectDelay', this.value);
        showSnackbar('No cookie delay updated');
      });
    }
    
    // Show indicator toggle
    if (showIndicatorCheckbox) {
      const newCheckbox = showIndicatorCheckbox.cloneNode(true);
      showIndicatorCheckbox.parentNode.replaceChild(newCheckbox, showIndicatorCheckbox);
      
      newCheckbox.addEventListener('change', async function() {
        await saveSetting('showIndicator', this.checked);
        showSnackbar(this.checked ? 'No cookie mode enabled' : 'No cookie mode disabled');
      });
    }
    
    // Auto-refresh toggle
    if (autoRefreshCheckbox) {
      const newCheckbox = autoRefreshCheckbox.cloneNode(true);
      autoRefreshCheckbox.parentNode.replaceChild(newCheckbox, autoRefreshCheckbox);
      
      newCheckbox.addEventListener('change', async function() {
        await saveSetting('autoRefresh', this.checked);
        showSnackbar(this.checked ? 'Auto-refresh enabled' : 'Auto-refresh disabled');
      });
    }
    
    // Reset settings
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) {
      const newResetBtn = resetSettingsBtn.cloneNode(true);
      resetSettingsBtn.parentNode.replaceChild(newResetBtn, resetSettingsBtn);
      
      newResetBtn.addEventListener('click', async function() {
        if (confirm('Reset all settings to default values?')) {
          await sendMessage({
            action: 'updateSettings',
            settings: {
              theme: 'system',
              redirectDelay: 100,
              showIndicator: true,
              autoRefresh: true,
              playbackMode: 'current-tab'
            }
          });
          
          const response = await sendMessage({ action: 'getStatus' });
          const settings = response.settings || {};
          
          const theme = settings.theme || 'system';
          updateThemeUI(theme);
          
          const playbackMode = settings.playbackMode || 'current-tab';
          updatePlaybackModeUI(playbackMode);
          
          const updatedDelayInput = document.getElementById('redirectDelay');
          const updatedShowIndicator = document.getElementById('showIndicator');
          const updatedAutoRefresh = document.getElementById('autoRefresh');
          
          if (updatedDelayInput) updatedDelayInput.value = settings.redirectDelay || 100;
          if (updatedShowIndicator) updatedShowIndicator.checked = settings.showIndicator !== false;
          if (updatedAutoRefresh) updatedAutoRefresh.checked = settings.autoRefresh !== false;
          
          showSnackbar('Settings reset to defaults');
        }
      });
    }
    
    // Reset all data
    const resetAllBtn = document.getElementById('resetAllBtn');
    if (resetAllBtn) {
      const newResetAllBtn = resetAllBtn.cloneNode(true);
      resetAllBtn.parentNode.replaceChild(newResetAllBtn, resetAllBtn);
      
      newResetAllBtn.addEventListener('click', async function() {
        if (confirm('⚠️ Warning: This will reset ALL data including your preferences. Are you sure?')) {
          await sendMessage({ action: 'resetAll' });
          showSnackbar('All data has been reset');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      });
    }
  }
  
  function initFeaturesToggle() {
    const featuresToggleBtn = document.getElementById('featuresToggleBtn');
    const featuresList = document.getElementById('featuresList');
    
    if (featuresToggleBtn && featuresList) {
      featuresToggleBtn.addEventListener('click', () => {
        const isCollapsed = featuresList.classList.contains('collapsed');
        
        if (isCollapsed) {
          featuresList.classList.remove('collapsed');
          featuresList.classList.add('expanded');
          featuresToggleBtn.innerHTML = '<span>Show Less</span><i class="fas fa-chevron-up"></i>';
          featuresToggleBtn.classList.add('collapsed');
        } else {
          featuresList.classList.remove('expanded');
          featuresList.classList.add('collapsed');
          featuresToggleBtn.innerHTML = '<span>Show More</span><i class="fas fa-chevron-down"></i>';
          featuresToggleBtn.classList.remove('collapsed');
        }
      });
    }
  }
  
  function updateThemeUI(theme) {
    const themeCards = document.querySelectorAll('.theme-card');
    const themeIndicator = document.getElementById('themeIndicator');
    const themeText = themeIndicator?.querySelector('.theme-text');
    
    themeCards.forEach(card => {
      card.classList.remove('active');
      if (card.dataset.theme === theme) {
        card.classList.add('active');
      }
    });
    
    if (themeText) {
      const themeName = theme.charAt(0).toUpperCase() + theme.slice(1);
      themeText.textContent = themeName;
    }
  }
  
  function updatePlaybackModeUI(mode) {
    const playbackCards = document.querySelectorAll('.playback-card');
    const playbackText = document.querySelector('.playback-text');

    playbackCards.forEach(card => {
      card.classList.remove('active');
      if (card.dataset.playback === mode) {
        card.classList.add('active');
      }
    });

    if (playbackText) {
      playbackText.textContent = getPlaybackModeLabel(mode);
    }
  }

  function getPlaybackModeLabel(mode) {
    const labels = {
      'new-tab': 'New Tab',
      'current-tab': 'Current Tab',
      'in-page-overlay': 'Overlay',
      'floating-player': 'Floating'
    };
    return labels[mode] || 'Current Tab';
  }

  async function saveSetting(key, value) {
    await sendMessage({
      action: 'updateSettings',
      settings: { [key]: value }
    });
  }
  
  function showMainMenu() {
    mainMenu.style.display = 'flex';
    settingsMenu.style.display = 'none';
    
    // Re-initialize main menu components if needed
    toggleSwitch.disabled = false;
  }
  
  async function openSettingsMenu() {
    await loadOptionsPage();
    mainMenu.style.display = 'none';
    settingsMenu.style.display = 'flex';
  }
  
  // Event Listeners
  openSettingsBtn.addEventListener('click', openSettingsMenu);
  
  toggleSwitch.addEventListener('change', async function() {
    if (isLoading) return;
    
    const newState = this.checked;
    toggleSwitch.disabled = true;
    
    try {
      const response = await sendMessage({ 
        action: 'toggle', 
        enabled: newState 
      });
      
      if (response.success) {
        isEnabled = newState;
        updateUI();
        showSnackbar(
          newState ? 'No cookie mode enabled' : 'No cookie mode disabled',
          newState ? 'success' : 'info'
        );
      } else {
        throw new Error('Toggle failed');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toggleSwitch.checked = !newState;
      showSnackbar('Failed to update settings', 'error');
    } finally {
      toggleSwitch.disabled = false;
    }
  });
  
  testBtn.addEventListener('click', async function() {
    this.classList.add('loading');
    try {
      const response = await sendMessage({ action: 'testRedirect' });
      if (response.success) {
        showSnackbar('Opening test video...', 'success');
        setTimeout(() => window.close(), 500);
      }
    } catch (error) {
      console.error('Test redirect error:', error);
      showSnackbar('Failed to open test video', 'error');
    } finally {
      this.classList.remove('loading');
    }
  });
  
  refreshBtn.addEventListener('click', async function() {
    this.classList.add('loading');
    try {
      const response = await sendMessage({ action: 'refreshPage' });
      if (response.success) {
        showSnackbar('Refreshing current tab...', 'success');
        setTimeout(() => window.close(), 500);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      showSnackbar('Failed to refresh page', 'error');
    } finally {
      this.classList.remove('loading');
    }
  });
  
  githubAttribution.addEventListener('click', function() {
    chrome.tabs.create({
      url: 'https://github.com/rr-uchchash360/No-Cookie-YouTube',
      active: true
    });
    showSnackbar('Opening GitHub profile...', 'info');
    setTimeout(() => window.close(), 300);
  });
  
  // Helper Functions
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  async function getExtensionVersion() {
    try {
      return chrome.runtime.getManifest().version;
    } catch (error) {
      console.error('Failed to get extension version:', error);
      return '0.0.0';
    }
  }
  
  function showSnackbar(message, type = 'info') {
    const existingSnackbar = document.querySelector('.youtube-snackbar');
    if (existingSnackbar) {
      existingSnackbar.remove();
    }
    
    const snackbar = document.createElement('div');
    snackbar.className = `youtube-snackbar ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    snackbar.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(snackbar);
    
    setTimeout(() => {
      snackbar.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      snackbar.classList.remove('show');
      setTimeout(() => {
        if (snackbar.parentNode) {
          snackbar.remove();
        }
      }, 300);
    }, 3000);
  }
  
  function showError(message) {
    statusIndicator.classList.add('status-inactive');
    statusIndicator.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-text">ERROR</span>
    `;
    statusDescription.textContent = message;
    statusDescription.style.color = '#ff4d4d';
    toggleSwitch.disabled = true;
  }
  
  // Add loading animation to buttons
  const buttons = [testBtn, refreshBtn];
  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      const icon = this.querySelector('i');
      if (icon) {
        const originalClass = icon.className;
        icon.className = 'fas fa-spinner fa-spin';
        
        setTimeout(() => {
          if (this.classList.contains('loading')) {
            icon.className = originalClass;
            this.classList.remove('loading');
          }
        }, 2000);
      }
    });
  });

  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    });
  }
});