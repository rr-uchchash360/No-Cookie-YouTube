(function () {
  'use strict';

  /* ---- Elements ---- */
  var nav = document.getElementById('nav');
  var toggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  var backToTop = document.querySelector('.back-to-top');

  /* ---- Mobile nav toggle ---- */
  toggle.addEventListener('click', function () {
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
    });
  });

  /* ---- Scroll effects ---- */
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 50);
    backToTop.classList.toggle('visible', y > 500);
  }, { passive: true });

  /* ---- Smooth scroll for anchors ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---- Download / Version helpers ---- */
  var downloadIds = ['download-btn', 'nav-download', 'install-btn', 'cta-btn'];
  var versionIds = ['download-version', 'nav-version', 'install-version', 'cta-version'];

  function getEl(id) { return document.getElementById(id); }

  function setDownload(tag, url) {
    var filename = 'No-Cookie-YouTube-' + tag + '.zip';
    downloadIds.forEach(function (id) {
      var el = getEl(id);
      if (el) { el.href = url; el.download = filename; }
    });
    versionIds.forEach(function (id) {
      var el = getEl(id);
      if (el) el.textContent = tag;
    });
  }

  function getDownloadUrl(tag, asset) {
    if (asset) return asset.browser_download_url;
    return 'https://github.com/rr-uchchash360/No-Cookie-YouTube/archive/refs/tags/' + tag + '.zip';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  function renderMarkdown(body) {
    if (!body) return '';
    var lines = body.replace(/\r/g, '').split('\n');
    var html = '';
    var inList = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (/^#### /.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h5>' + inlineFormat(line.replace(/^#### /, '')) + '</h5>';
      } else if (/^### /.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h4>' + inlineFormat(line.replace(/^### /, '')) + '</h4>';
      } else if (/^## /.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h3>' + inlineFormat(line.replace(/^## /, '')) + '</h3>';
      } else if (/^# /.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h2>' + inlineFormat(line.replace(/^# /, '')) + '</h2>';
      } else if (/^[-*] /.test(line)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + inlineFormat(line.replace(/^[-*] /, '')) + '</li>';
      } else if (line.trim() === '') {
        if (inList) { html += '</ul>'; inList = false; }
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<p>' + inlineFormat(line) + '</p>';
      }
    }
    if (inList) html += '</ul>';

    return html;
  }

  function inlineFormat(text) {
    return escapeHtml(text)
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function extractWhatsNew(body) {
    if (!body) return '';
    var lines = body.replace(/\r/g, '').split('\n');
    var inSection = false;
    var sectionLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.replace(/^#+\s*/, '').trim().replace(/^[^a-zA-Z]+/, '');
      if (/^What'?s\s*New/i.test(trimmed)) {
        inSection = true;
        continue;
      }
      if (inSection) {
        if (/^#{1,6}\s(?:[^#]|$)/.test(line)) break;
        sectionLines.push(line);
      }
    }

    while (sectionLines.length > 0 && sectionLines[0].trim() === '') {
      sectionLines.shift();
    }

    while (sectionLines.length > 0 && sectionLines[sectionLines.length - 1].trim() === '') {
      sectionLines.pop();
    }

    return sectionLines.length > 0 ? sectionLines.join('\n') : body;
  }

  /* ---- Fallback version data ---- */
  var FALLBACK_VERSIONS = [
    {
      tag_name: 'v1.1.0',
      published_at: '2026-07-14T06:44:00Z',
      body: "# No Cookie YouTube v1.1.0\n\n**Playback Mode Update**\n*Choose how videos open on YouTube*\n\n## \uD83C\uDFAF What's New\n\n* **4 Playback Modes**: Choose between New Tab, Current Tab, In-Page Overlay, or Floating Player\n* **In-Page Overlay**: Watch videos in a full-screen overlay with a dark blurred backdrop\n* **Floating Player**: A draggable, resizable PiP-style player that stays on top\n* **Click Interception**: Overlay and Floating modes intercept video link clicks",
      assets: []
    },
    {
      tag_name: 'v1.0.1',
      published_at: '2026-01-08T17:33:00Z',
      body: "# No Cookie YouTube v1.0.1\n\n**Bug Fix Release**\n*Improved privacy redirect reliability*\n\n## \uD83C\uDFAF What's New\n\n* **Bug Fix**: Fixed an issue in v1.0.0 where hostname rewriting could break some YouTube links\n* **Reliability**: Improved redirect logic\n* **Local Player**: Bundled local privacy player\n* Credit: dariusgrassi for the redirect fix",
      assets: []
    },
    {
      tag_name: 'v1.0.0',
      published_at: '2026-01-03T15:38:00Z',
      body: "# No Cookie YouTube v1.0.0\n\n**Initial Release**\n*Privacy-focused YouTube without tracking*\n\n## \uD83C\uDFAF What's New\n\n* **Core Privacy**: Redirects YouTube to youtube-nocookie.com domain\n* **Automatic**: Works in background with no user interaction needed\n* **Shorts Support**: Works with YouTube Shorts\n* **Themes**: Dark, light, and system themes\n* **Configurable**: Adjustable redirect delay",
      assets: []
    }
  ];

  /* ---- Build version history UI ---- */
  function buildVersionHistory(releases) {
    var versionInfo = getEl('version-info');
    if (!versionInfo) return;
    if (!releases || releases.length === 0) {
      versionInfo.innerHTML = '';
      return;
    }

    releases.sort(function (a, b) {
      var da = a.published_at ? new Date(a.published_at) : new Date(0);
      var db = b.published_at ? new Date(b.published_at) : new Date(0);
      return db - da;
    });

    var latest = releases[0];
    var asset = latest.assets && latest.assets.length > 0 ? latest.assets[0] : null;
    setDownload(latest.tag_name, getDownloadUrl(latest.tag_name, asset));

    var html = '';

    /* What's New */
    html += '<div class="whats-new">';
    html += '<div class="whats-new-header">';
    html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    html += '<span>What\'s New in <strong>' + escapeHtml(latest.tag_name) + '</strong></span>';
    if (latest.published_at) {
      html += '<span class="whats-new-date">' + formatDate(latest.published_at) + '</span>';
    }
    html += '</div>';
    if (latest.body) {
      html += '<div class="release-body">' + renderMarkdown(extractWhatsNew(latest.body)) + '</div>';
    }
    html += '</div>';

    /* Check other versions (collapsible) */
    if (releases.length > 1) {
      html += '<div class="version-others">';
      html += '<button class="version-toggle" id="version-toggle">';
      html += '<span>Check other versions</span>';
      html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
      html += '</button>';
      html += '<div class="version-list" id="version-list">';

      for (var i = 0; i < releases.length; i++) {
        var r = releases[i];
        var dlUrl = getDownloadUrl(r.tag_name, r.assets && r.assets[0] ? r.assets[0] : null);
        var isLatest = i === 0;

        html += '<div class="version-item' + (isLatest ? ' version-item-latest' : '') + '">';
        html += '<div class="version-header">';
        html += '<button class="version-expand" aria-label="Toggle release notes">';
        html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
        html += '</button>';
        html += '<div class="version-tag-group">';
        html += '<span class="version-tag">' + escapeHtml(r.tag_name) + '</span>';
        if (isLatest) html += '<span class="version-current">Latest</span>';
        html += '</div>';
        if (r.published_at) {
          html += '<span class="version-date">' + formatDate(r.published_at) + '</span>';
        }
        html += '<a href="' + dlUrl + '" class="version-dl-btn" download="No-Cookie-YouTube-' + r.tag_name + '.zip">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        html += 'Download';
        html += '</a>';
        html += '</div>';
        if (r.body) {
          html += '<div class="version-body">' + renderMarkdown(extractWhatsNew(r.body)) + '</div>';
        }
        html += '</div>';
      }

      html += '</div>';
      html += '</div>';
    }

    versionInfo.innerHTML = html;

    var toggleBtn = getEl('version-toggle');
    var versionList = getEl('version-list');
    if (toggleBtn && versionList) {
      toggleBtn.addEventListener('click', function () {
        var isOpen = versionList.classList.toggle('open');
        toggleBtn.classList.toggle('open', isOpen);
        toggleBtn.setAttribute('aria-expanded', isOpen);
      });
    }

    document.querySelectorAll('.version-item').forEach(function (item) {
      var expandBtn = item.querySelector('.version-expand');
      var body = item.querySelector('.version-body');
      if (expandBtn && body) {
        expandBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          item.classList.toggle('expanded');
          expandBtn.classList.toggle('open');
        });
      }
    });
  }

  /* ---- Fetch releases ---- */
  function tryApi() {
    fetch('https://api.github.com/repos/rr-uchchash360/No-Cookie-YouTube/releases?per_page=10')
      .then(function (r) {
        if (!r.ok) throw new Error('API returned ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          buildVersionHistory(data);
        } else {
          buildVersionHistory(FALLBACK_VERSIONS);
        }
      })
      .catch(function () {
        buildVersionHistory(FALLBACK_VERSIONS);
      });
  }

  tryApi();

  /* ---- Lightbox ---- */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');

  document.querySelectorAll('.screenshot-img').forEach(function (img) {
    img.addEventListener('click', function () {
      lightboxImg.src = this.src;
      lightboxImg.alt = this.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });

  /* ---- Intersection Observer for fade-in ---- */
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in').forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll('.fade-in').forEach(function (el) {
      el.classList.add('visible');
    });
  }

})();
