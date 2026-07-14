let indicatorTimeout = null;
let activePlayers = [];
let activeOverlay = null;
let openedNewTabVideos = new Set();
let currentPlaybackMode = 'current-tab';

function interceptVideoClicks() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="/watch?v="], a[href*="/shorts/"]');
    if (!link) return;

    const href = link.getAttribute('href');
    let videoId = '';

    if (href.includes('/watch?v=')) {
      try {
        const url = new URL(href, window.location.origin);
        videoId = url.searchParams.get('v');
      } catch {
        const m = href.match(/[?&]v=([^&]+)/);
        if (m) videoId = m[1];
      }
    } else if (href.includes('/shorts/')) {
      videoId = href.split('/shorts/')[1].split('?')[0];
    }

    if (!videoId) return;

    if (currentPlaybackMode === 'in-page-overlay' || currentPlaybackMode === 'floating-player') {
      e.preventDefault();
      e.stopPropagation();

      if (currentPlaybackMode === 'in-page-overlay') {
        if (activeOverlay) closeOverlay();
        createOverlayPlayer(videoId);
      } else {
        if (activePlayers.some(p => p.videoId === videoId)) return;
        createFloatingPlayer(videoId);
      }
    }
  }, true);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'redirectStatusChanged') {
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

chrome.storage.local.get(['enabled', 'showIndicator', 'playbackMode'], (result) => {
  const isEnabled = result.enabled !== false;
  const showIndicator = result.showIndicator !== false;
  currentPlaybackMode = result.playbackMode || 'current-tab';

  if (showIndicator) {
    updateRedirectState(isEnabled);
  }

  if (isEnabled && window.location.hostname.includes('youtube.com')) {
    attemptRedirect();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.playbackMode) {
    currentPlaybackMode = changes.playbackMode.newValue || 'current-tab';
  }
});

function updateRedirectState(enabled) {
  if (indicatorTimeout) {
    clearTimeout(indicatorTimeout);
    indicatorTimeout = null;
  }

  const existingIndicator = document.getElementById('redirect-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const indicator = document.createElement('div');
  indicator.id = 'redirect-indicator';

  if (enabled) {
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

  const appendIndicator = () => {
    if (document.body) {
      document.body.appendChild(indicator);

      indicatorTimeout = setTimeout(() => {
        if (indicator.parentNode && indicator.style.opacity === '1') {
          indicator.style.opacity = '0';
        }
      }, 2700);

      indicatorTimeout = setTimeout(() => {
        if (indicator.parentNode) {
          indicator.remove();
        }
        indicatorTimeout = null;
      }, 3000);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendIndicator);
  } else {
    appendIndicator();
  }
}

async function attemptRedirect() {
  const currentUrl = window.location.href;
  const isWatchPage = currentUrl.includes('/watch?v=');
  const isShortsPage = currentUrl.includes('/shorts/');
  const isYouTubeDomain = currentUrl.includes('youtube.com');
  const isAlreadyRedirected = currentUrl.includes('player.html') || currentUrl.includes('youtube-nocookie.com');

  if (!((isWatchPage || isShortsPage) && isYouTubeDomain && !isAlreadyRedirected)) return;

  try {
    let videoId = '';

    if (isWatchPage) {
      const urlParams = new URLSearchParams(window.location.search);
      videoId = urlParams.get('v');
    } else if (isShortsPage) {
      videoId = currentUrl.split('/shorts/')[1].split('?')[0];
    }

    if (!videoId) return;

    switch (currentPlaybackMode) {
      case 'new-tab': {
        if (openedNewTabVideos.has(videoId)) return;
        openedNewTabVideos.add(videoId);
        const playerUrl = chrome.runtime.getURL(`player/player.html?v=${videoId}`);
        chrome.runtime.sendMessage({ action: 'openNewTab', url: playerUrl });
        break;
      }

      case 'current-tab': {
        const playerUrl = chrome.runtime.getURL(`player/player.html?v=${videoId}`);
        console.log('Redirecting to local player:', playerUrl);
        setTimeout(() => { window.location.replace(playerUrl); }, 100);
        break;
      }

      case 'in-page-overlay': {
        if (activeOverlay && activeOverlay.dataset.videoId === videoId) return;
        if (activeOverlay) closeOverlay();
        createOverlayPlayer(videoId);
        break;
      }

      case 'floating-player': {
        if (activePlayers.some(p => p.videoId === videoId)) return;
        createFloatingPlayer(videoId);
        break;
      }
    }
  } catch (error) {
    console.error('No Cookie YouTube error:', error);
  }
}

function createOverlayPlayer(videoId) {
  const overlay = document.createElement('div');
  overlay.id = 'nco-overlay';
  overlay.dataset.videoId = videoId;

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ncoFadeIn 0.2s ease;
  `;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  `;

  const playerContainer = document.createElement('div');
  playerContainer.style.cssText = `
    position: relative;
    width: 80vw;
    max-width: 960px;
    aspect-ratio: 16 / 9;
    max-height: 80vh;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    z-index: 1;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close overlay');
  closeBtn.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    background: rgba(0,0,0,0.6);
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 22px;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    line-height: 1;
  `;
  closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(255,0,0,0.8)'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(0,0,0,0.6)'; };

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
  iframe.allow = 'accelerometer; autoplay; gyroscope; picture-in-picture; fullscreen';
  iframe.referrerPolicy = 'no-referrer';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes ncoFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  playerContainer.appendChild(closeBtn);
  playerContainer.appendChild(iframe);
  overlay.appendChild(backdrop);
  overlay.appendChild(playerContainer);
  document.body.appendChild(overlay);

  activeOverlay = overlay;

  closeBtn.onclick = closeOverlay;

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeOverlay();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function closeOverlay() {
  if (!activeOverlay) return;
  activeOverlay.remove();
  activeOverlay = null;
}

function createFloatingPlayer(videoId) {
  const player = document.createElement('div');
  player.className = 'nco-floating-player';

  const idx = activePlayers.length;
  const offset = Math.min(idx * 30, 150);

  player.style.cssText = `
    position: fixed;
    bottom: ${20 + offset}px;
    right: ${20 + offset}px;
    width: 400px;
    height: 300px;
    background: #0f0f0f;
    border: 1px solid #3f3f3f;
    border-radius: 8px;
    overflow: hidden;
    z-index: 2147483646;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    font-family: Arial, Helvetica, sans-serif;
    cursor: default;
    user-select: none;
    transition: box-shadow 0.2s;
  `;
  player.onmouseenter = () => { player.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)'; };
  player.onmouseleave = () => { player.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'; };

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #1a1a1a;
    border-bottom: 1px solid #3f3f3f;
    cursor: grab;
    flex-shrink: 0;
    min-height: 36px;
  `;
  header.onmousedown = (e) => startDrag(e, player);

  const title = document.createElement('span');
  title.textContent = 'Now Playing';
  title.style.cssText = `
    flex: 1;
    font-size: 12px;
    color: #aaaaaa;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const minimizeBtn = document.createElement('button');
  minimizeBtn.innerHTML = '&#8722;';
  minimizeBtn.title = 'Minimize';
  minimizeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #aaaaaa;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
    padding: 0;
    line-height: 1;
  `;
  minimizeBtn.onmouseenter = () => { minimizeBtn.style.background = '#3f3f3f'; };
  minimizeBtn.onmouseleave = () => { minimizeBtn.style.background = 'transparent'; };
  minimizeBtn.onclick = (e) => { e.stopPropagation(); toggleMinimize(player); };

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Close';
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #aaaaaa;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s, color 0.2s;
    margin-left: 4px;
    padding: 0;
    line-height: 1;
  `;
  closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(255,0,0,0.3)'; closeBtn.style.color = '#ff4444'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#aaaaaa'; };
  closeBtn.onclick = (e) => { e.stopPropagation(); closePlayer(player); };

  header.appendChild(title);
  header.appendChild(minimizeBtn);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.style.cssText = `
    flex: 1;
    position: relative;
    overflow: hidden;
  `;

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
  iframe.allow = 'accelerometer; autoplay; gyroscope; picture-in-picture; fullscreen';
  iframe.referrerPolicy = 'no-referrer';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;

  body.appendChild(iframe);

  const resizeHandle = document.createElement('div');
  resizeHandle.style.cssText = `
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    z-index: 5;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 2px;
  `;
  resizeHandle.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <line x1="4" y1="10" x2="10" y2="4" stroke="#555" stroke-width="1.5"/>
    <line x1="1" y1="10" x2="10" y2="1" stroke="#555" stroke-width="1.5"/>
  </svg>`;
  resizeHandle.onmousedown = (e) => startResize(e, player);

  body.appendChild(resizeHandle);

  player.appendChild(header);
  player.appendChild(body);
  document.body.appendChild(player);

  activePlayers.push({
    element: player,
    body: body,
    videoId: videoId,
    minimized: false
  });
}

function startDrag(e, playerEl) {
  if (e.button !== 0) return;
  const rect = playerEl.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  const onMove = (e) => {
    playerEl.style.left = (e.clientX - offsetX) + 'px';
    playerEl.style.top = (e.clientY - offsetY) + 'px';
    playerEl.style.right = 'auto';
    playerEl.style.bottom = 'auto';
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startResize(e, playerEl) {
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = playerEl.offsetWidth;
  const startHeight = playerEl.offsetHeight;

  const onMove = (e) => {
    const newWidth = Math.max(240, startWidth + (e.clientX - startX));
    const newHeight = Math.max(180, startHeight + (e.clientY - startY));
    playerEl.style.width = newWidth + 'px';
    playerEl.style.height = newHeight + 'px';
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function toggleMinimize(playerEl) {
  const entry = activePlayers.find(p => p.element === playerEl);
  if (!entry) return;

  if (entry.minimized) {
    playerEl.style.height = entry._origHeight || '300px';
    playerEl.style.width = entry._origWidth || '400px';
    entry.body.style.display = '';
    entry.minimized = false;
  } else {
    entry._origWidth = playerEl.style.width || '400px';
    entry._origHeight = playerEl.style.height || '300px';
    playerEl.style.height = '36px';
    playerEl.style.width = '160px';
    entry.body.style.display = 'none';
    entry.minimized = true;
  }
}

function closePlayer(playerEl) {
  const idx = activePlayers.findIndex(p => p.element === playerEl);
  if (idx !== -1) {
    activePlayers.splice(idx, 1);
  }
  playerEl.remove();
}

function closeAllPlayers() {
  while (activePlayers.length > 0) {
    const p = activePlayers.pop();
    p.element.remove();
  }
}

function cleanup() {
  if (indicatorTimeout) {
    clearTimeout(indicatorTimeout);
    indicatorTimeout = null;
  }

  const existingIndicator = document.getElementById('redirect-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  if (activeOverlay) {
    closeOverlay();
  }

  closeAllPlayers();
  openedNewTabVideos.clear();
}

window.addEventListener('beforeunload', cleanup);

function setupUrlChangeObserver() {
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;

      chrome.storage.local.get(['enabled'], (result) => {
        if (result.enabled === false) return;

        if (activeOverlay) closeOverlay();
        setTimeout(attemptRedirect, 100);
      });
    }
  });

  observer.observe(document, {
    subtree: true,
    childList: true
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupUrlChangeObserver();
    interceptVideoClicks();
  });
} else {
  setupUrlChangeObserver();
  interceptVideoClicks();
}


