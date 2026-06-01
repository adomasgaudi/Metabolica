/* ============================================================
   shell.js — shared shell behaviour for every Metabolica page.
   Single source of truth for: the tier state, the top-bar tier
   badge (which doubles as the tier toggle), the bottom nav, and the
   beta gate. Keeping these here means editing one file updates all
   pages, so the nav can't silently drift between index/guide/methodology.

   Tiers:  beta  = default / restricted (guide only)
           alpha = full tracker with testing features (password "ag")
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'metabolica_tier';
  var Tier = {
    get: function () {
      try { return localStorage.getItem(KEY) === 'alpha' ? 'alpha' : 'beta'; }
      catch (e) { return 'beta'; }
    },
    set: function (t) { try { localStorage.setItem(KEY, t); } catch (e) {} }
  };

  var ICON = {
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-7"/></svg>',
    logs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="13" y2="17"/></svg>',
    diet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
    guide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4v15a2 2 0 0 0 2 2h13"/><path d="M4 4h13a2 2 0 0 1 2 2v13H6a2 2 0 0 0-2 2"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
  };

  // Build the bottom-nav markup. On the app page (index) the weight views are
  // in-page buttons (data-view); on content pages they are links back to index.
  function navHTML(page) {
    var isApp = page === 'app';
    function locked(key, label) {
      var inner = ICON[key] + '<span>' + label + '</span><span class="soon-tag">soon</span>';
      if (isApp) {
        var act = key === 'chart' ? ' active' : '';
        return '<button class="nav-btn nav-locked' + act + '" data-view="' + key + '">' + inner + '</button>';
      }
      return '<a class="nav-btn nav-locked" href="index.html#' + key + '">' + inner + '</a>';
    }
    var add = '<div class="add-btn-wrap full-only">' +
      (isApp
        ? '<button class="add-btn" id="add-btn" aria-label="Add weight">' + ICON.add + '</button>'
        : '<a class="add-btn" href="index.html#add" aria-label="Add weight">' + ICON.add + '</a>') +
      '</div>';
    var guideActive = page === 'guide' ? ' active' : '';
    var guide = '<a class="nav-btn' + guideActive + '" href="guide.html">' + ICON.guide + '<span>Guide</span></a>';
    return locked('chart', 'Chart') + locked('logs', 'Logs') + add + locked('diet', 'Diet') + guide;
  }

  function renderNav() {
    var nav = document.querySelector('nav.bottom-nav');
    if (!nav) return;
    nav.innerHTML = navHTML(nav.getAttribute('data-page') || 'app');
  }

  // Top-bar tier control: a single badge that names the current tier AND toggles
  // it on click. beta->alpha is gated by the password; alpha->beta is free.
  function renderTierControls() {
    var right = document.querySelector('.topbar-right');
    if (!right || right.querySelector('#tier-badge')) return;
    var frag = document.createElement('div');
    frag.style.display = 'contents';
    frag.innerHTML =
      '<span id="tier-badge" class="tier-badge" role="button" tabindex="0" ' +
      'title="Switch tier" style="cursor:pointer;"></span>';
    right.insertBefore(frag, right.firstChild);
  }

  function applyTier() {
    var t = Tier.get();
    document.body.classList.toggle('tier-restricted', t !== 'alpha');
    var badge = document.getElementById('tier-badge');
    if (badge) { badge.textContent = t.toUpperCase(); badge.className = 'tier-badge tier-badge-' + t; }
  }

  var GATE_HTML =
    '<div class="beta-gate" id="beta-gate" hidden>' +
      '<div class="beta-gate-card">' +
        '<h3>Enter alpha</h3>' +
        '<p>The full tracker is in private alpha. Enter the password to continue.</p>' +
        '<input type="password" id="beta-pass" placeholder="Password" autocomplete="off">' +
        '<p class="beta-error" id="beta-error" hidden>Wrong password.</p>' +
        '<div class="beta-gate-actions">' +
          '<button class="beta-cancel" id="beta-cancel" type="button">Cancel</button>' +
          '<button class="beta-go" id="beta-go" type="button">Unlock</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  function injectGate() {
    if (document.getElementById('beta-gate')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = GATE_HTML;
    document.body.appendChild(wrap.firstChild);
  }

  function wireGate() {
    var gate = document.getElementById('beta-gate');
    var pass = document.getElementById('beta-pass');
    var err = document.getElementById('beta-error');
    function openGate() { err.hidden = true; pass.value = ''; gate.hidden = false; setTimeout(function () { pass.focus(); }, 50); }
    function unlock() {
      if (pass.value.trim() === 'ag') { Tier.set('alpha'); location.href = 'index.html'; }
      else { err.hidden = false; }
    }
    // The badge is the sole tier control: alpha->beta is free, beta->alpha is gated.
    var badge = document.getElementById('tier-badge');
    function toggleTier() {
      if (Tier.get() === 'alpha') { Tier.set('beta'); location.href = 'guide.html'; }
      else { openGate(); }
    }
    if (badge) {
      badge.addEventListener('click', toggleTier);
      badge.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTier(); }
      });
    }
    if (!gate) return;
    document.getElementById('beta-cancel').addEventListener('click', function () { gate.hidden = true; });
    document.getElementById('beta-go').addEventListener('click', unlock);
    pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });
  }

  function boot() {
    renderTierControls();
    renderNav();
    injectGate();
    applyTier();
    wireGate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Exposed so page scripts can reuse the single tier source if needed.
  window.Shell = { Tier: Tier, applyTier: applyTier };
})();
