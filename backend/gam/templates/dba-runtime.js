// DBA Runtime — renders match cards into GAM creatives.
//
// Embedded by the GAM creative (external script URL or inlined into the
// exported HTML snippet). On load it finds every `.matches[data-feed]` node,
// fetches its feed JSON (or paints data-sample-b64), and renders an
// auto-rotating carousel of match cards inside.
//
// Hosted by Express at GET /dba-runtime.js. CDN cache is 5 minutes so a
// redeploy propagates without re-publishing GAM creatives.
//
// Public API:
//   window.DbaRenderMatches(node, data)   manual render hook
//
// Node attributes (read at run time):
//   data-feed         required — AdsGeneratorService /GetPayload URL
//   data-per-slide    games per slide (default 2). Replaces older data-max.
//   data-interval     ms between slides (default 3500)
//   data-transition   ms slide animation (default 700)
//   data-max          legacy alias for data-per-slide (kept so older creatives
//                     keep working without re-publish)
//
// Feed shape — accepts any of:
//   { Games:   [ { Comps:[{ID,Name,SName}], Lines:[{Options:[{Num,Rate}]}],
//                  ISOStartTime, FormatedStartTime } ] }   ← /GetPayload
//   { matches: [ { home:{id,name}, away:{id,name}, odds:[n,n,n],
//                  date|ISOStartTime } ] }                 ← React preview
//   [ ... ]                                                ← bare array
(function () {
  'use strict';

  var ROOT_SEL = '.matches[data-feed]';

  // Cloudinary team-logo source. 42×42 = 2× retina for the ~21 px MPU crest;
  // c_limit means "no upscale"; d_countries:default.png yields a transparent
  // placeholder when a team has no logo configured.
  var TEAM_LOGO_BASE = 'https://res.cloudinary.com/scores365/image/upload/w_42,h_42,c_limit,d_countries:default.png/Competitors/';

  function el(tag, props, children) {
    var n = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        if (k === 'style') {
          for (var s in props.style) n.style[s] = props.style[s];
        } else if (k === 'text') {
          n.textContent = props[k];
        } else if (k === 'class') {
          n.className = props[k];
        } else {
          n.setAttribute(k, props[k]);
        }
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        if (children[i]) n.appendChild(children[i]);
      }
    }
    return n;
  }

  // Decimal-odds formatter. Whole numbers get a trailing .0 (3 → "3.0");
  // values that already have decimals pass through unchanged, never rounded
  // (1.85 → "1.85", 1.5 → "1.5", 2.875 → "2.875").
  function fmtOdd(rate) {
    var n = Number(rate);
    if (!isFinite(n)) return String(rate == null ? '' : rate);
    var s = String(n);
    return s.indexOf('.') === -1 ? s + '.0' : s;
  }

  // Kickoff formatter — parses the feed's UTC ISOStartTime and renders in the
  // viewer's device-local timezone. Locale is fixed pt-BR so the date order
  // (dd/MM) matches the existing pill style; only the zone follows the device.
  // Returns '' on parse failure so callers can fall back to FormatedStartTime.
  function fmtKickoff(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      var date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      var time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return date + ' ' + time;
    } catch (e) {
      return '';
    }
  }

  function teamLogoUrl(id) { return id != null ? (TEAM_LOGO_BASE + id) : null; }

  // One side of the matchup. Crests sit on the OUTER sides of the names:
  // home: [logo][name] · – · away: [name][logo].
  // Name sits in a flex slot so long names ellipsize without stretching the ad.
  function teamBlock(comp, side) {
    var name = (comp && (comp.SName || comp.Name || comp.name)) || '';
    var id = comp && (comp.ID != null ? comp.ID : comp.id);
    var url = teamLogoUrl(id);
    var nameEl = el('span', { 'class': 'dba-team-name', text: name });
    var nameSlot = el('span', { 'class': 'dba-team-name-slot' }, [nameEl]);
    var children = [];
    var logoEl;
    if (url) {
      logoEl = el('img', { 'class': 'dba-team-logo', src: url, alt: '' });
    }
    if (side === 'home') {
      if (logoEl) children.push(logoEl);
      children.push(nameSlot);
    } else {
      children.push(nameSlot);
      if (logoEl) children.push(logoEl);
    }
    var node = el('div', { 'class': 'dba-teamblock dba-teamblock-' + side }, children);
    if (logoEl) logoEl.onerror = function () { logoEl.style.visibility = 'hidden'; };
    return node;
  }

  // Interstitial only: crest image for the odds row (same class as the
  // teams-row crest so the shared --dba-int-crest sizing CSS still applies).
  function teamCrestImg(comp) {
    var id = comp && (comp.ID != null ? comp.ID : comp.id);
    var url = teamLogoUrl(id);
    if (!url) return null;
    var logoEl = el('img', { 'class': 'dba-team-logo', src: url, alt: '' });
    logoEl.onerror = function () { logoEl.style.visibility = 'hidden'; };
    return logoEl;
  }

  function extractMatches(data) {
    if (!data) return [];
    if (Array.isArray(data.Games)) return data.Games;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.matches)) return data.matches;
    if (Array.isArray(data.games)) return data.games;
    return [];
  }

  // Kickoff millis from live feed (ISO) or preview sample ("dd/MM · HH:mm").
  function gameStartMs(m) {
    if (!m) return NaN;
    var iso = m.ISOStartTime || m.isoStartTime || m.StartTime;
    if (iso) {
      var t = Date.parse(iso);
      if (!isNaN(t)) return t;
    }
    var raw = m.date || m.FormatedStartTime || m.STime || '';
    var match = String(raw).match(/(\d{1,2})\/(\d{1,2})\s*[·.\-]?\s*(\d{1,2}):(\d{2})/);
    if (!match) return NaN;
    var day = +match[1];
    var month = +match[2] - 1;
    var hour = +match[3];
    var min = +match[4];
    var now = new Date();
    var d = new Date(now.getFullYear(), month, day, hour, min, 0, 0);
    return d.getTime();
  }

  // Only future kickoffs (1 min clock skew). Live in-play (Active) stays.
  function isUpcomingOrLive(m) {
    if (m && (m.Active === true || m.active === true)) return true;
    var t = gameStartMs(m);
    if (isNaN(t)) return false;
    return t >= Date.now() - 60 * 1000;
  }

  function filterUpcoming(games) {
    if (!games || !games.length) return [];
    return games.filter(isUpcomingOrLive);
  }

  function injectStyles() {
    if (document.getElementById('dba-runtime-styles')) return;
    // Scoped under .matches so the creative's outer .ad styles own
    // positioning/typography. Visual tuning should track AdPreview.jsx's MPU
    // MatchRow and the carousel viewport sizing in mpu-standard.html.
    var css =
      '.matches .dba-track { display: flex; height: 100%; will-change: transform; }' +
      '.matches .dba-slide {' +
        'flex: 0 0 auto; width: 100%; max-width: 100%;' +
        'display: flex; flex-direction: column; gap: 8px;' +
        'box-sizing: border-box; overflow: hidden;' +
      '}' +
      '.ad-stack .matches .dba-slide { overflow: hidden; }' +
      '.matches[data-layout="banner"] .dba-slide { overflow: hidden; }' +
      '.matches .dba-card {' +
        'background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.15);' +
        'border-radius: 12px; padding: 8px 12px 10px; position: relative;' +
        'display: flex; flex-direction: column; gap: 6px; overflow: hidden;' +
      '}' +
      '.matches .dba-pill-anchor { display: flex; justify-content: center; flex-shrink: 0; }' +
      '.matches .dba-pill {' +
        'position: static; transform: none; top: auto; left: auto;' +
        'background: var(--dba-pill-bg, transparent); color: var(--dba-pill-fg, inherit);' +
        'height: 16px; padding: 0 11px; margin: 0; box-sizing: border-box;' +
        'border-radius: 999px; font-size: 9px; font-weight: 600; line-height: 1;' +
        'white-space: nowrap; display: inline-flex; align-items: center; justify-content: center;' +
      '}' +
      '.matches .dba-pill-text { display: block; line-height: 1; transform: translateY(0.5px); }' +
      '.matches .dba-teams { display: flex; align-items: center; gap: 0; margin-top: 0; font-size: 12px; font-weight: 600; min-width: 0; }' +
      '.matches .dba-teamblock { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }' +
      '.matches .dba-teamblock-home { justify-content: flex-end; }' +
      '.matches .dba-teamblock-away { justify-content: flex-start; }' +
      '.matches .dba-team-logo { width: 20.7px; height: 20.7px; flex: 0 0 auto; object-fit: contain; border-radius: 50%; background: rgba(255,255,255,0.08); }' +
      '.matches .dba-team-name-slot {' +
        'flex: 0 1 auto; min-width: 0; overflow: hidden;' +
        'display: flex; align-items: center;' +
      '}' +
      '.matches .dba-teamblock-home .dba-team-name-slot { justify-content: flex-end; }' +
      '.matches .dba-teamblock-away .dba-team-name-slot { justify-content: flex-start; }' +
      '.matches .dba-team-name {' +
        'display: block; max-width: 100%; min-width: 0;' +
        'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' +
      '}' +
      '.matches .dba-x { font-size: 12px; font-weight: 700; opacity: 0.65; flex: 0 0 auto; margin: 0 12px; }' +
      '.matches .dba-odds { display: flex; align-items: center; margin-top: 0; min-width: 0; min-height: 14px; font-size: 10px; font-weight: 700; line-height: 1.2; overflow: visible; }' +
      '.matches .dba-odd-slot { display: flex; align-items: center; min-width: 0; }' +
      '.matches .dba-odd-slot-home { flex: 1; justify-content: flex-end; padding-right: 24px; }' +
      '.matches .dba-odd-slot-draw { position: relative; flex: 0 0 auto; margin: 0 12px; font-size: 10px; font-weight: 700; line-height: 1.2; }' +
      '.matches .dba-odd-slot-draw:before { content: "\\2013"; visibility: hidden; }' +
      '.matches .dba-odd-slot-draw .dba-odd { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }' +
      '.matches .dba-odd-slot-away { flex: 1; justify-content: flex-start; padding-left: 24px; }' +
      '.matches .dba-odd { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; line-height: 1.2; }' +
      '.matches .dba-odd-label { font-size: 7px; font-weight: 800; color: #FFC107; line-height: 1.2; }' +
      '.matches .dba-v-gap { display: none; }' +
      '.ad-stack .matches { margin: 0; padding-top: 0; overflow: hidden; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-slide { gap: 6px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-card { border-radius: 11px; padding: 8px 10px 9px; gap: 4px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-pill { padding: 0 10px; height: 14px; font-size: 8px; }' +
      '.ad-shell.legal-band .ad-stack .matches { flex: 0 0 auto; margin-top: 0; margin-bottom: 4px; padding-top: 0; overflow: hidden; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-teams { gap: 0; margin-top: 0; font-size: 11px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-teamblock { gap: 5px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-team-logo { width: 17.25px; height: 17.25px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-x { font-size: 11px; margin: 0 10px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-odds { margin-top: 0; font-size: 9px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-odd-slot-home { padding-right: 20px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-odd-slot-draw { margin: 0 10px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-odd-slot-away { padding-left: 20px; }' +
      '.ad-shell.legal-band .ad-stack .matches .dba-odd-label { font-size: 6px; }' +
      '.matches[data-layout="banner"] { display: flex; align-items: stretch; overflow: hidden; }' +
      '.matches[data-layout="banner"] .dba-track { height: 100%; }' +
      '.matches[data-layout="banner"] .dba-slide { gap: 0; justify-content: flex-start; height: 100%; overflow: hidden; }' +
      '.matches[data-layout="banner"] .dba-card {' +
        'background: transparent; border: none; border-radius: 0; padding: 0;' +
        'display: flex; flex-direction: column; align-items: stretch;' +
        'justify-content: flex-start; gap: 3px; height: 100%; box-sizing: border-box;' +
        'position: relative; overflow: hidden;' +
      '}' +
      '.matches[data-layout="banner"] .dba-pill-anchor {' +
        'display: block; position: relative; height: 14px; flex-shrink: 0;' +
      '}' +
      '.matches[data-layout="banner"] .dba-pill {' +
        'position: absolute; top: 0; left: 50%; transform: translateX(-50%);' +
        'height: 100%; box-sizing: border-box; padding: 0 6px; margin: 0;' +
        'display: inline-flex; align-items: center; justify-content: center;' +
        'font-size: 8px; font-weight: 600; line-height: 1; white-space: nowrap;' +
      '}' +
      '.matches[data-layout="banner"] .dba-v-gap { display: none; }' +
      '.matches[data-layout="banner"] .dba-teams {' +
        'position: relative; justify-content: center; gap: 0; margin-top: 0; font-size: 11px;' +
        'flex-shrink: 0; width: 100%; min-width: 0; min-height: 11px;' +
      '}' +
      '.matches[data-layout="banner"] .dba-teamblock {' +
        'position: absolute; top: 0; bottom: 0; flex: none; min-width: 0; gap: 4px;' +
        'overflow: hidden; box-sizing: border-box;' +
      '}' +
      '.matches[data-layout="banner"] .dba-teamblock-home { left: 0; right: 50%; }' +
      '.matches[data-layout="banner"] .dba-teamblock-away { left: 50%; right: 0; }' +
      '.matches[data-layout="banner"] .dba-team-logo { width: 12.65px; height: 12.65px; flex: 0 0 auto; }' +
      '.matches[data-layout="banner"] .dba-x {' +
        'position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);' +
        'font-size: 11px; opacity: 0.6; margin: 0; flex: 0 0 auto; z-index: 1; line-height: 1;' +
      '}' +
      '.matches[data-layout="banner"] .dba-odds {' +
        'position: relative; height: 11px; display: block; margin-top: 0; font-size: 9px; flex-shrink: 0;' +
      '}' +
      '.matches[data-layout="banner"] .dba-odd-slot { display: contents; }' +
      '.matches[data-layout="banner"] .dba-odd-slot-draw:before { content: none; }' +
      '.matches[data-layout="banner"] .dba-odd {' +
        'position: absolute; top: 0; left: 0; transform: translateX(-50%); gap: 2px;' +
      '}' +
      '.matches[data-layout="banner"] .dba-odd-label { font-size: 6.5px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-card { gap: 2px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-pill-anchor { height: 9px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-pill { padding: 0 3px; font-size: 6.6px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-teams { gap: 2px; font-size: 8.5px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-team-logo { width: 10.35px; height: 10.35px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-x { font-size: 8.5px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-odds { height: 9px; font-size: 7px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-odd-label { font-size: 5.5px; }' +
      '.matches[data-layout="interstitial"] { flex: 1 1 0; min-height: 0; }' +
      '.matches[data-layout="interstitial"] .dba-track { min-height: 0; height: 100%; }' +
      '.matches[data-layout="interstitial"] .dba-slide {' +
        'height: 100%; min-height: 0; box-sizing: border-box;' +
        'display: flex; flex-direction: column; justify-content: flex-start;' +
        'align-items: stretch; gap: 0; overflow: hidden;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-card {' +
        'flex: 0 0 auto; min-height: 0; margin: 0;' +
        'box-sizing: border-box;' +
        'background: var(--dba-card-bg, rgba(255,255,255,0.10));' +
        'border-radius: 1.4em; padding: 5px 3.5% 0.3em; gap: var(--dba-int-pillgap, 12px); overflow: hidden;' +
        'display: flex; flex-direction: column; justify-content: flex-start;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-card-sep {' +
        'flex: 0 0 auto; width: 100%; margin: 0; padding: 0; border: 0;' +
        'height: var(--dba-card-gap, 16px); min-height: 10px; pointer-events: none;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-card + .dba-card { margin-top: 0; }' +
      '.matches[data-layout="interstitial"] .dba-card:last-child { margin-bottom: 0; }' +
      '.matches[data-layout="interstitial"] .dba-pill {' +
        'position: static; transform: none; top: auto; left: auto;' +
        'height: auto; min-height: 0; padding: 0.3em 1.4em; font-size: var(--dba-int-pill, 4.2em);' +
        'flex: 0 0 auto;' +
      '}' +
      '.ad-shell .matches[data-layout="interstitial"] .dba-team-logo {' +
        'flex: 0 0 var(--dba-int-crest, 48px) !important; width: var(--dba-int-crest, 48px) !important;' +
        'height: var(--dba-int-crest, 48px) !important; max-width: var(--dba-int-crest, 48px) !important;' +
        'max-height: var(--dba-int-crest, 48px) !important;' +
        'object-fit: contain; border-radius: 0 !important; background: transparent !important;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-team-logo {' +
        'flex: 0 0 var(--dba-int-crest, 48px); width: var(--dba-int-crest, 48px); height: var(--dba-int-crest, 48px);' +
        'max-width: var(--dba-int-crest, 48px); max-height: var(--dba-int-crest, 48px);' +
        'object-fit: contain; border-radius: 0; background: transparent;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odds {' +
        'flex: 0 0 auto; min-height: var(--dba-int-crest, 48px);' +
        'display: flex; align-items: center; justify-content: center;' +
        'width: 100%; min-width: 0; gap: 3%; overflow: visible;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd-box {' +
        'flex: 1 1 0; min-width: 0; box-sizing: border-box;' +
        'display: flex; align-items: center; justify-content: center;' +
        'background: var(--dba-odds-box-bg, rgba(255,255,255,0.16)); border-radius: 0.7em; padding: 0.5em 0.3em;' +
        'font-size: var(--dba-int-odds, 4.2em);' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd-box .dba-odd {' +
        'font-size: var(--dba-int-odds-text, inherit); font-weight: 600; color: var(--dba-odds-text-color, inherit); white-space: nowrap;' +
      '}' +
      '.ad-shell.legal-band .matches[data-layout="interstitial"] {' +
        'flex: 1 1 0; min-height: 0; margin: 0; padding-top: 0; overflow: hidden;' +
      '}' +
      '.ad-shell.legal-band .matches[data-layout="interstitial"] .dba-card-sep {' +
        'height: var(--dba-card-gap-tight, 18px);' +
      '}' +
      '.ad-shell.legal-band .matches[data-layout="interstitial"] .dba-card + .dba-card { margin-top: 0; }' +
      '.ad-shell.legal-band .matches[data-layout="interstitial"] ~ .cta-zone {' +
        'flex: 0 0 auto; flex-shrink: 0; position: relative; z-index: 2;' +
      '}' +
      '.ad-shell.legal-band .matches[data-layout="interstitial"] ~ .cta-zone .cta {' +
        'position: relative; left: auto; right: auto; bottom: auto; margin-top: 0;' +
        'border-radius: 10px;' +
      '}' +
      '.ad .dba-dots, .ad-shell > .dba-dots-shell { display: flex; justify-content: center; align-items: center; flex-shrink: 0; pointer-events: none; color: inherit; }' +
      '.ad .dba-dot, .ad-shell > .dba-dots-shell .dba-dot { display: inline-block; border-radius: 999px; background: currentColor; opacity: 0.35; transition: width 0.3s, opacity 0.3s; }' +
      '.ad .dba-dot-active, .ad-shell > .dba-dots-shell .dba-dot-active { opacity: 1; }' +
      '.ad-shell > .dba-dots-shell[data-layout="mpu"] { position: absolute; left: 0; right: 0; bottom: 12px; height: 10px; margin-top: 0; gap: 6px; z-index: 5; }' +
      '.ad-shell > .dba-dots-shell[data-layout="mpu"] .dba-dot { height: 4px; width: 4px; }' +
      '.ad-shell > .dba-dots-shell[data-layout="mpu"] .dba-dot-active { width: 9.6px; }' +
      '.ad-shell.legal-band > .dba-dots-shell[data-layout="mpu"] { bottom: 29px; }' +
      '.ad .dba-dots[data-layout="mpu"] { position: absolute; left: 0; right: 0; bottom: 12px; height: 10px; margin-top: 0; gap: 6px; z-index: 2; }' +
      '.ad .dba-dots[data-layout="mpu"] .dba-dot { height: 4px; width: 4px; }' +
      '.ad .dba-dots[data-layout="mpu"] .dba-dot-active { width: 9.6px; }' +
      '.ad-shell.legal-band .ad-stack ~ .cta { position: absolute; left: 12px; right: 12px; bottom: 43px; margin-top: 0; z-index: 2; }' +
      '.ad .dba-dots[data-layout="interstitial"] { height: 2.8em; min-height: 10px; max-height: 4%; margin: 0.6% 0; gap: 0.8em; }' +
      '.ad .dba-dots[data-layout="interstitial"] .dba-dot { height: 0.8em; width: 0.8em; min-height: 4px; min-width: 4px; }' +
      '.ad .dba-dots[data-layout="interstitial"] .dba-dot-active { width: 1.6em; min-width: 8px; }' +
      '.ad .cta-zone > .dba-dots[data-layout="interstitial"] + .cta { margin-top: 0; }' +
      '.ad-shell.legal-band .ad .dba-dots[data-layout="interstitial"] { margin: 0.6% 0; }';
    var s = el('style', { id: 'dba-runtime-styles' });
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function renderCard(m, layout) {
    // Primary shape (AdsGeneratorService /GetPayload).
    var comps = Array.isArray(m.Comps) ? m.Comps : null;
    var lines = Array.isArray(m.Lines) ? m.Lines : null;
    var opts  = lines && lines[0] && Array.isArray(lines[0].Options) ? lines[0].Options : null;

    // Fallback shape (React-preview/DBA_SAMPLE_MATCHES).
    if (!comps && m.home && m.away) {
      comps = [
        { ID: m.home.id != null ? m.home.id : null, Name: m.home.name || m.home.Name },
        { ID: m.away.id != null ? m.away.id : null, Name: m.away.name || m.away.Name },
      ];
    }
    var odds;
    if (opts) {
      odds = opts.slice().sort(function (a, b) { return (a.Num || 0) - (b.Num || 0); })
                  .map(function (o) { return o.Rate; });
    } else if (Array.isArray(m.odds)) {
      odds = m.odds;
    } else {
      odds = [m.homeOdds, m.drawOdds, m.awayOdds].filter(function (v) { return v != null; });
    }

    var pillText = fmtKickoff(m.ISOStartTime) || m.FormatedStartTime || m.STime || m.date || '';
    if (!comps) comps = [];

    if (layout === 'interstitial') {
      // Interstitial: no team names row at all \u2014 crests sit on the outer
      // edges, with the three odds as boxed chips in between.
      var oddBoxes = [odds[0], odds[1], odds[2]].map(function (o) {
        return o != null ? el('div', { 'class': 'dba-odd-box' }, [
          el('span', { 'class': 'dba-odd', text: fmtOdd(o) }),
        ]) : null;
      });
      return el('div', { 'class': 'dba-card' }, [
        el('div', { 'class': 'dba-pill-anchor' }, [
          el('div', { 'class': 'dba-pill' }, [
            el('span', { 'class': 'dba-pill-text', text: pillText }),
          ]),
        ]),
        el('div', { 'class': 'dba-odds' }, [teamCrestImg(comps[0])].concat(oddBoxes, [teamCrestImg(comps[1])]).filter(Boolean)),
      ]);
    }

    var labels = ['1', 'X', '2'];
    var slots = ['home', 'draw', 'away'];
    var oddNodes = odds.filter(function (v) { return v != null; }).map(function (o, i) {
      return el('div', { 'class': 'dba-odd-slot dba-odd-slot-' + (slots[i] || 'home') }, [
        el('span', { 'class': 'dba-odd' }, [
          el('span', { 'class': 'dba-odd-label', text: labels[i] || '' }),
          el('span', { 'class': 'dba-odd-val', text: fmtOdd(o) }),
        ]),
      ]);
    });

    return el('div', { 'class': 'dba-card' }, [
      el('div', { 'class': 'dba-pill-anchor' }, [
        el('div', { 'class': 'dba-pill' }, [
          el('span', { 'class': 'dba-pill-text', text: pillText }),
        ]),
      ]),
      el('div', { 'class': 'dba-v-gap' }),
      el('div', { 'class': 'dba-teams' }, [
        teamBlock(comps[0], 'home'),
        el('span', { 'class': 'dba-x', text: '–' }),
        teamBlock(comps[1], 'away'),
      ]),
      el('div', { 'class': 'dba-v-gap' }),
      el('div', { 'class': 'dba-odds' }, oddNodes),
    ]);
  }

  function buildSlides(games, perSlide, layout) {
    var slides = [];
    for (var i = 0; i < games.length; i += perSlide) {
      var slide = el('div', { 'class': 'dba-slide' });
      var page = games.slice(i, i + perSlide);
      for (var j = 0; j < page.length; j++) slide.appendChild(renderCard(page[j], layout));
      slides.push(slide);
    }
    return slides;
  }

  function dotLayoutKey(node) {
    var layout = node.getAttribute('data-layout');
    if (layout === 'banner') return null;
    return layout === 'interstitial' ? 'interstitial' : 'mpu';
  }

  function removeDots(node) {
    var shell = node.closest('.ad-shell');
    if (shell) {
      var shellDots = shell.querySelector('.dba-dots-shell');
      if (shellDots) shellDots.parentNode.removeChild(shellDots);
    }
    var ad = node.closest('.ad');
    if (!ad) return;
    var existing = ad.querySelector('.dba-dots');
    if (existing) existing.parentNode.removeChild(existing);
  }

  function mountDots(node, slideCount) {
    removeDots(node);
    var layoutKey = dotLayoutKey(node);
    if (!layoutKey || slideCount < 2) return null;

    var shell = node.closest('.ad-shell');
    var ad = node.closest('.ad');
    if (!shell && !ad) return null;

    var dots = el('div', { 'class': 'dba-dots', 'data-layout': layoutKey });
    for (var i = 0; i < slideCount; i++) {
      dots.appendChild(el('span', { 'class': 'dba-dot' + (i === 0 ? ' dba-dot-active' : '') }));
    }

    // MPU: shell (absolute) so SafeFrame does not drop dots inside the click <a>.
    // Interstitial: in-flow before the CTA (between match cards and button).
    if (layoutKey === 'interstitial' && ad) {
      var ctaZone = ad.querySelector('.cta-zone');
      var cta = ad.querySelector('.cta');
      var matches = ad.querySelector('.matches');
      if (ctaZone && cta) ctaZone.insertBefore(dots, cta);
      else if (matches) ad.insertBefore(dots, matches.nextSibling);
      else if (ctaZone) ad.insertBefore(dots, ctaZone);
      else if (cta) ad.insertBefore(dots, cta);
      else ad.appendChild(dots);
    } else if (shell) {
      dots.classList.add('dba-dots-shell');
      var legal = shell.querySelector('.legal');
      if (legal) shell.insertBefore(dots, legal);
      else shell.appendChild(dots);
      if (ad) {
        try {
          var c = window.getComputedStyle(ad).color;
          if (c) dots.style.color = c;
        } catch (e) { /* preview iframe */ }
      }
    } else if (ad) {
      var ctaEl = ad.querySelector('.cta');
      if (ctaEl) ad.insertBefore(dots, ctaEl.nextSibling);
      else ad.appendChild(dots);
    }
    return dots;
  }

  function updateDots(dotsEl, activeIdx) {
    if (!dotsEl) return;
    var dots = dotsEl.querySelectorAll('.dba-dot');
    for (var i = 0; i < dots.length; i++) {
      if (i === activeIdx) dots[i].classList.add('dba-dot-active');
      else dots[i].classList.remove('dba-dot-active');
    }
  }

  // Mount slides into `node`. When there's more than one slide, run an
  // infinite-forward carousel: animate to a clone of slide 0 sitting at the
  // end of the track, then drop the transition and reset translateX(0). The
  // snap is invisible because both endpoints render the same content.
  //
  // Transform math (must match AdPreview): track width = slideCount * 100% of
  // the viewport; each slide is 100/slideCount of the track; translate by
  // -(pos / slideCount * 100)% of the track (= one viewport per step).
  // Using translateX(-pos * 100%) is wrong — % is relative to the track itself.
  function mountCarousel(node, slides, intervalMs, transitionMs) {
    while (node.firstChild) node.removeChild(node.firstChild);
    if (!slides.length) {
      removeDots(node);
      return;
    }

    var track = el('div', { 'class': 'dba-track' });
    for (var i = 0; i < slides.length; i++) track.appendChild(slides[i]);
    node.appendChild(track);

    var n = slides.length;
    var dotsEl = mountDots(node, n);

    if (n < 2) {
      track.style.width = '100%';
      if (slides[0]) {
        slides[0].style.flex = '0 0 100%';
        slides[0].style.width = '100%';
        if (node.getAttribute('data-layout') === 'interstitial') slides[0].style.height = '100%';
      }
      return;
    }

    track.appendChild(slides[0].cloneNode(true));

    var slideCount = n + 1;
    var slidePct = 100 / slideCount;
    track.style.width = (slideCount * 100) + '%';
    var kids = track.children;
    for (var s = 0; s < kids.length; s++) {
      kids[s].style.flex = '0 0 ' + slidePct + '%';
      kids[s].style.width = slidePct + '%';
      kids[s].style.maxWidth = slidePct + '%';
      kids[s].style.boxSizing = 'border-box';
    }

    var pos = 0;
    function setActive(idx) {
      updateDots(dotsEl, ((idx % n) + n) % n);
    }
    function goTo(p, withTransition) {
      track.style.transition = withTransition
        ? ('transform ' + transitionMs + 'ms cubic-bezier(0.32, 0.72, 0.24, 1)')
        : 'none';
      track.style.transform = 'translate3d(-' + ((p * 100) / slideCount) + '%, 0, 0)';
    }
    function advance() {
      pos++;
      setActive(pos);
      goTo(pos, true);
      scheduleAlign(node);
      if (pos === n) {
        setTimeout(function () {
          pos = 0;
          setActive(0);
          goTo(0, false);
          void track.offsetWidth;
          scheduleAlign(node);
        }, transitionMs + 30);
      }
    }
    setActive(0);
    goTo(0, false);
    setInterval(advance, intervalMs);
  }

  // Banner only: dash / pill follow this card's centre (ad midline when the
  // slide is on screen). Odds stay at a fixed offset from that centre — not
  // under crests — so 1 / X / 2 do not jump when team names change.
  function alignBannerOdds(card) {
    var homeBlock = card.querySelector('.dba-teamblock-home');
    var awayBlock = card.querySelector('.dba-teamblock-away');
    var homeName = card.querySelector('.dba-teamblock-home .dba-team-name');
    var awayName = card.querySelector('.dba-teamblock-away .dba-team-name');
    var teams = card.querySelector('.dba-teams');
    var x = card.querySelector('.dba-x');
    var oddsRow = card.querySelector('.dba-odds');
    var pill = card.querySelector('.dba-pill');
    if (!homeName || !awayName || !x || !oddsRow || !teams) return;
    var odds = oddsRow.querySelectorAll('.dba-odd');
    if (odds.length < 3) return;
    if (teams.offsetWidth < 1) return;

    var centerLocal = teams.offsetWidth / 2;
    var xGap = 2;
    x.style.left = centerLocal + 'px';
    var xW = x.offsetWidth || 8;
    if (homeBlock) {
      homeBlock.style.left = '0';
      homeBlock.style.right = Math.max(0, teams.offsetWidth - centerLocal + xW / 2 + xGap) + 'px';
    }
    if (awayBlock) {
      awayBlock.style.left = Math.max(0, centerLocal + xW / 2 + xGap) + 'px';
      awayBlock.style.right = '0';
    }

    var oddsRect = oddsRow.getBoundingClientRect();
    var teamsRect = teams.getBoundingClientRect();
    var scaleX = teamsRect.width / teams.offsetWidth || 1;
    var xRect = x.getBoundingClientRect();
    var xC = (xRect.left + xRect.width / 2 - oddsRect.left) / scaleX;
    var shell = card.closest('.ad-shell');
    var spread = (shell && shell.classList.contains('legal-band')) ? 28 : 38;
    if (pill) {
      var cardRect = card.getBoundingClientRect();
      pill.style.left = ((xRect.left + xRect.width / 2 - cardRect.left) / scaleX) + 'px';
    }
    odds[0].style.left = (xC - spread) + 'px';
    odds[1].style.left = xC + 'px';
    odds[2].style.left = (xC + spread) + 'px';
  }

  function interstitialDesignH(w) {
    return Math.round((w || 320) * 1.5);
  }

  function applyInterstitialCrestSizes(root, crestPx) {
    if (!root || crestPx < 1) return;
    var logos = root.querySelectorAll('.dba-team-logo');
    for (var i = 0; i < logos.length; i++) {
      logos[i].style.width = crestPx + 'px';
      logos[i].style.height = crestPx + 'px';
      logos[i].style.flex = '0 0 ' + crestPx + 'px';
      logos[i].style.maxWidth = crestPx + 'px';
      logos[i].style.maxHeight = crestPx + 'px';
    }
  }

  function applyInterstitialTypeScale(shell, cardH, w) {
    if (!shell || cardH < 1 || w < 1) return 0;
    /* Team names bigger again (production feedback: previous pass read too
       small); crest bigger again (crests live on the odds row now), then
       bumped once more on top of that per later feedback. */
    var team = Math.round(w * 0.046);
    team = Math.max(20, Math.min(team, Math.round(cardH * 0.15)));
    var crest = Math.round(w * 0.095);
    crest = Math.max(46, Math.min(crest, Math.round(cardH * 0.4)));
    /* Slightly bigger date/time pill text. */
    var pill = Math.max(15, Math.round(w * 0.03));
    /* Odds-box SIZE (padding/radius) — its own variable now (was briefly
       tied to the pill's, per an earlier "same size as date/time" request;
       a later request asked for the odds specifically to grow, then this
       pass brought it back down 15%). .dba-odd-box sets its own font-size
       to this value so the box's em-based radius/padding scale with it. */
    var odds = Math.round(w * 0.046);
    odds = Math.max(24, Math.min(odds, Math.round(cardH * 0.162)));
    /* Odds NUMBER text — smaller than the box size above, per a request to
       shrink just the digits without shrinking the boxes around them (10%,
       then another 15% on top per follow-up feedback that it still read
       too big: 0.9 * 0.85 = 0.765). */
    var oddsText = Math.round(odds * 0.765);
    /* Gap between the date pill and the crest/odds line below it — a share
       of the card height so it grows with the card instead of staying a
       near-invisible sliver on narrow slots. */
    var pillGap = Math.max(14, Math.round(cardH * 0.2));
    shell.style.setProperty('--dba-int-team', team + 'px');
    shell.style.setProperty('--dba-int-crest', crest + 'px');
    shell.style.setProperty('--dba-int-pill', pill + 'px');
    shell.style.setProperty('--dba-int-odds', odds + 'px');
    shell.style.setProperty('--dba-int-odds-text', oddsText + 'px');
    shell.style.setProperty('--dba-int-pillgap', pillGap + 'px');
    return crest;
  }

  function applyInterstitialCtaPlacement(ad) {
    if (!ad) return;
    var ctaZone = ad.querySelector('.cta-zone');
    if (ctaZone) ctaZone.style.marginTop = 'auto';

    var bottomSpacer = ad.querySelector('.dba-int-spacer');
    if (bottomSpacer) {
      bottomSpacer.style.display = 'none';
      bottomSpacer.style.flex = '0 0 0';
      bottomSpacer.style.height = '0';
    }
    var topSpacer = ad.querySelector('.dba-int-spacer-top');
    if (topSpacer) {
      topSpacer.style.display = 'none';
      topSpacer.style.flex = '0 0 0';
      topSpacer.style.height = '0';
    }
  }

  function applyInterstitialLogoLayout(shell, w, trueW) {
    if (!shell || w < 1) return;
    var ad = shell.querySelector('.ad');
    if (!ad) return;
    var logoWrap = ad.querySelector('.logo-wrap');
    var logo = ad.querySelector('.logo');
    // Height-driven, not a forced square: real bookmaker logos are usually
    // wide wordmarks (see design ref), and boxing them at width=height wasted
    // vertical space that belongs to the match cards below. `w` here is the
    // design-scaled effective width (see applyShellMetrics) so the logo grows
    // with the rest of the ad on taller-than-2:3 slots; `trueW` (the real
    // render width) caps it so it can never overflow the actual ad width.
    var cap = (trueW && trueW > 0 ? trueW : w) * 0.92;
    var logoH = Math.max(26, Math.round(w * 0.09));
    var logoW = Math.min(cap, Math.round(w * 0.62));
    if (logoWrap) {
      logoWrap.style.flex = '0 0 auto';
      logoWrap.style.minHeight = logoH + 'px';
      logoWrap.style.overflow = 'visible';
    }
    if (logo) {
      logo.style.width = logoW + 'px';
      logo.style.height = logoH + 'px';
      logo.style.maxWidth = logoW + 'px';
      // Override the CSS max-height:64px fallback (a pre-JS-paint sanity cap
      // for the untouched case) — it would otherwise silently clip logoH back
      // down on scaled-up (tall) slots since max-height wins over height.
      logo.style.maxHeight = logoH + 'px';
      logo.style.flexShrink = '0';
    }
  }

  function applyLegalBandMetrics(shell, h) {
    if (!shell || !shell.classList.contains('legal-band')) return 0;
    var minLegal = Math.round(h * 0.10);
    shell.style.setProperty('--dba-shell-h', h + 'px');
    shell.style.setProperty('--dba-legal-h', minLegal + 'px');
    shell.style.setProperty('--dba-legal-font', Math.max(12, Math.round(h * 0.012)) + 'px');
    var legal = shell.querySelector('.legal');
    if (legal) {
      legal.style.minHeight = minLegal + 'px';
      legal.style.height = minLegal + 'px';
      legal.style.flex = '0 0 ' + minLegal + 'px';
    }
    return minLegal;
  }

  function applyShellMetrics() {
    var shell = document.querySelector('.ad-shell');
    if (!shell) return null;
    var w = shell.clientWidth || document.documentElement.clientWidth || 320;
    var h = shell.clientHeight || document.documentElement.clientHeight || Math.round(w * 1.5);
    if (w < 1) w = 320;
    if (h < 1) h = Math.round(w * 1.5);
    var interstitial = !!document.querySelector('.matches[data-layout="interstitial"]');
    // Interstitial content (logo/cards/CTA) is designed for a 2:3 (w:h) box.
    // Real ad slots vary — some are much taller (e.g. 640x1280 = 1:2). Rather
    // than leaving that extra height as dead space below the cards, scale the
    // whole ad up as if it were authored at a wider "effective" width, so
    // logo/crests/text/CTA all grow together to fill more of the slot.
    // Clamped so extreme ratios don't run away (or shrink content) too far.
    var designScale = 1;
    if (interstitial) {
      var designH = w * 1.5;
      designScale = Math.max(0.85, Math.min(2.2, h / designH));
    }
    var we = w * designScale;
    var unit = interstitial ? (we * 0.0105) : (Math.min(w, h / 1.5) * 0.01);
    shell.style.fontSize = unit + 'px';
    var cardGapPx = Math.round(h * 0.045);
    var tightGapPx = Math.round(h * 0.034);
    shell.style.setProperty('--dba-card-gap', cardGapPx + 'px');
    shell.style.setProperty('--dba-card-gap-tight', tightGapPx + 'px');
    if (interstitial) applyInterstitialLogoLayout(shell, we, w);
    if (shell.classList.contains('legal-band')) {
      applyLegalBandMetrics(shell, h);
    }
    return {
      cardGapPx: cardGapPx, tightGapPx: tightGapPx,
      legalBand: shell.classList.contains('legal-band'),
      shellH: h, shellW: w, designScale: designScale,
    };
  }

  function applyInterstitialShellLayout(root) {
    var shell = root ? root.closest('.ad-shell') : document.querySelector('.ad-shell');
    if (!shell) return 0;
    var ad = shell.querySelector('.ad');
    var legalH = interstitialLegalHeight(shell);
    if (legalH > 0) shell.style.setProperty('--dba-legal-h', legalH + 'px');
    if (ad && shell.classList.contains('legal-band')) {
      var budget = Math.max(0, shell.clientHeight - legalH);
      ad.style.flex = '1 1 0';
      ad.style.minHeight = '0';
      ad.style.maxHeight = budget + 'px';
      ad.style.overflow = 'hidden';
      return budget;
    }
    return ad ? ad.clientHeight : shell.clientHeight;
  }

  /* Lock .matches to leftover space above CTA + below legal band. */
  function interstitialLegalHeight(shell) {
    if (!shell || !shell.classList.contains('legal-band')) return 0;
    var shellH = shell.clientHeight || 0;
    var minLegal = Math.round(shellH * 0.10);
    var legal = shell.querySelector('.legal');
    if (!legal) return minLegal;
    var h = legal.offsetHeight;
    if (h > 0) return Math.max(h, minLegal);
    try {
      var cs = window.getComputedStyle(legal);
      h = parseFloat(cs.height) || 0;
      if (h > 0) return Math.max(h, minLegal);
    } catch (e) { /* preview iframe */ }
    return minLegal;
  }

  function interstitialCtaBlockHeight(ad, legalBand) {
    if (!ad) return legalBand ? 96 : 72;
    var ctaZone = ad.querySelector('.cta-zone');
    var dots = ad.querySelector('.dba-dots[data-layout="interstitial"]');
    var cta = ad.querySelector('.cta');
    var h = ctaZone ? ctaZone.offsetHeight : 0;
    if (h < 24) {
      h = (dots ? dots.offsetHeight : 0) + (cta ? cta.offsetHeight : 0);
      try {
        var cs = ctaZone ? window.getComputedStyle(ctaZone) : null;
        if (cs) h += (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      } catch (e2) { /* preview iframe */ }
    }
    var floor = legalBand ? 96 : 72;
    return Math.max(h, cta ? cta.offsetHeight + 16 : floor, floor);
  }

  function applyInterstitialCardGaps(root) {
    if (root.getAttribute('data-layout') !== 'interstitial') return false;
    var metrics = applyShellMetrics();
    if (!metrics) return false;
    applyInterstitialShellLayout(root);

    var ad = root.closest('.ad');
    var shell = root.closest('.ad-shell');
    var legalH = interstitialLegalHeight(shell);
    var matchesH = root.clientHeight;
    var avail = matchesH;

    if (ad && shell) {
      var logo = ad.querySelector('.logo-wrap');
      var padY = 0;
      try {
        var cs = window.getComputedStyle(ad);
        padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      } catch (e) { /* preview iframe */ }
      var shellW = metrics.shellW || shell.clientWidth || 320;
      var shellH = metrics.shellH || shell.clientHeight || interstitialDesignH(shellW);
      var adBudget = Math.max(0, shellH - legalH);
      var ctaBlock = interstitialCtaBlockHeight(ad, shell.classList.contains('legal-band'));
      var logoH = logo ? logo.offsetHeight : 0;
      avail = Math.floor(adBudget - logoH - ctaBlock - padY - 4);
      applyInterstitialCtaPlacement(ad);
    }

    if (avail < 40) return false;

    var slides = root.querySelectorAll('.dba-slide');
    var appliedGap = 0;
    var shellW = metrics.shellW || (shell ? shell.clientWidth : 320);
    var crestPx = 0;
    var gapPx = 0;
    var cardH = 0;
    var n = 0;
    // Design-scaled effective width (see applyShellMetrics): on a taller-
    // than-2:3 slot this is bigger than shellW, so the max card height and
    // gap grow with it instead of capping cards to a fixed fraction of the
    // real (narrow) width and dumping the leftover height as dead space.
    var we = shellW * (metrics.designScale || 1);
    /* Cards ~26% of (effective) width (was 27% originally; inter-card gap
       overshot to 12.8% last round and read as too much dead space between
       cards, so it's pulled back close to the original ~3.8% here). The two
       ratios are sized together (3*0.26 + 2*0.053 ≈ 3*0.27 + 2*0.038) so the
       stack still covers the same total height. */
    var maxCardH = Math.round(we * 0.26);

    if (slides.length) {
      n = slides[0].querySelectorAll('.dba-card').length;
      gapPx = n > 1 ? Math.max(20, Math.round(we * 0.053)) : 0;
      cardH = Math.max(64, Math.min(maxCardH, Math.floor((avail - gapPx * Math.max(0, n - 1)) / Math.max(1, n))));
      appliedGap = gapPx;
    }

    root.style.flex = '1 1 0';
    root.style.height = 'auto';
    root.style.maxHeight = 'none';
    root.style.minHeight = '0';
    root.style.margin = '0';

    if (n > 0) crestPx = applyInterstitialTypeScale(shell, cardH, we);

    for (var s = 0; s < slides.length; s++) {
      var slide = slides[s];
      var cards = slide.querySelectorAll('.dba-card');
      var slideN = cards.length;
      if (slideN === 0) continue;

      var fitKey = avail + ':' + gapPx + ':' + slideN + ':' + cardH;
      if (slide.getAttribute('data-dba-fit') === fitKey) continue;

      var oldSeps = slide.querySelectorAll('.dba-card-sep');
      for (var o = 0; o < oldSeps.length; o++) {
        if (oldSeps[o].parentNode) oldSeps[o].parentNode.removeChild(oldSeps[o]);
      }
      slide.style.justifyContent = 'flex-start';
      slide.style.paddingTop = Math.max(6, Math.round(shellW * 0.01)) + 'px';
      slide.style.paddingBottom = '0';

      for (var i = 0; i < cards.length; i++) {
        cards[i].style.flex = '0 0 ' + cardH + 'px';
        cards[i].style.height = cardH + 'px';
        cards[i].style.maxHeight = cardH + 'px';
        cards[i].style.minHeight = '0';
        cards[i].style.margin = '0';
        if (i < slideN - 1 && gapPx > 0) {
          var sep = el('div', { 'class': 'dba-card-sep' });
          sep.style.flex = '0 0 ' + gapPx + 'px';
          sep.style.height = gapPx + 'px';
          sep.style.minHeight = gapPx + 'px';
          if (cards[i].nextSibling) slide.insertBefore(sep, cards[i].nextSibling);
          else slide.appendChild(sep);
        }
      }
      slide.setAttribute('data-dba-fit', fitKey);
    }

    if (crestPx) applyInterstitialCrestSizes(root, crestPx);

    if (shell && appliedGap) {
      shell.style.setProperty('--dba-card-gap', appliedGap + 'px');
      shell.style.setProperty('--dba-card-gap-tight', Math.max(6, Math.round(appliedGap * 0.75)) + 'px');
    }
    applyInterstitialShellLayout(root);
    return true;
  }

  function alignMatchLayout(root) {
    if (root.getAttribute('data-layout') === 'banner') {
      var cards = root.querySelectorAll('.dba-card');
      for (var i = 0; i < cards.length; i++) alignBannerOdds(cards[i]);
      return;
    }
    if (root.getAttribute('data-layout') === 'interstitial') applyInterstitialCardGaps(root);
  }

  function scheduleAlign(root) {
    alignMatchLayout(root);
    requestAnimationFrame(function () {
      if (root.getAttribute('data-layout') === 'interstitial') applyInterstitialCardGaps(root);
      else alignMatchLayout(root);
      requestAnimationFrame(function () {
        if (root.getAttribute('data-layout') === 'interstitial') applyInterstitialCardGaps(root);
        else alignMatchLayout(root);
        /* Dots mount into cta-zone and change its height — reflow once more. */
        setTimeout(function () {
          if (root.getAttribute('data-layout') === 'interstitial') applyInterstitialCardGaps(root);
        }, 50);
        setTimeout(function () {
          if (root.getAttribute('data-layout') === 'interstitial') applyInterstitialCardGaps(root);
        }, 200);
      });
    });
  }

  function applyPillTheme(node) {
    var bg = node.getAttribute('data-pill-bg');
    var fg = node.getAttribute('data-pill-fg');
    var oddsBoxBg = node.getAttribute('data-odds-box-bg');
    var oddsTextColor = node.getAttribute('data-odds-text-color');
    var cardBg = node.getAttribute('data-card-bg');
    node.style.setProperty('--dba-pill-bg', bg || 'transparent');
    if (fg) node.style.setProperty('--dba-pill-fg', fg);
    if (oddsBoxBg) node.style.setProperty('--dba-odds-box-bg', oddsBoxBg);
    if (oddsTextColor) node.style.setProperty('--dba-odds-text-color', oddsTextColor);
    if (cardBg) node.style.setProperty('--dba-card-bg', cardBg);
  }

  function render(node, data) {
    injectStyles();
    applyShellMetrics();
    applyPillTheme(node);
    var perSlide = parseInt(node.getAttribute('data-per-slide') || node.getAttribute('data-max') || '2', 10);
    if (!isFinite(perSlide) || perSlide <= 0) perSlide = 2;
    var intervalMs = parseInt(node.getAttribute('data-interval') || '3500', 10);
    var transitionMs = parseInt(node.getAttribute('data-transition') || '700', 10);

    var games = filterUpcoming(extractMatches(data));
    if (!games.length) return;
    var layout = node.getAttribute('data-layout') || '';
    var slides = buildSlides(games, perSlide, layout);
    mountCarousel(node, slides, intervalMs, transitionMs);
    scheduleAlign(node);
  }
  window.DbaRenderMatches = render;
  window.DbaApplyShellMetrics = applyShellMetrics;

  if (!window.__dbaShellMetricsBound) {
    window.__dbaShellMetricsBound = true;
    window.addEventListener('resize', function () {
      applyShellMetrics();
      var nodes = document.querySelectorAll('.matches[data-layout="interstitial"]');
      for (var i = 0; i < nodes.length; i++) applyInterstitialCardGaps(nodes[i]);
    });
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () {
        var nodes = document.querySelectorAll('.matches[data-layout="interstitial"]');
        for (var i = 0; i < nodes.length; i++) applyInterstitialCardGaps(nodes[i]);
      });
      function observeShell() {
        var shell = document.querySelector('.ad-shell');
        var ad = document.querySelector('.ad-shell .ad');
        var legal = document.querySelector('.ad-shell .legal');
        if (shell) ro.observe(shell);
        if (ad) ro.observe(ad);
        if (legal) ro.observe(legal);
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeShell);
      else observeShell();
    }
  }

  // Optional base64 JSON blob baked into the creative for GAM preview /
  // offline fallback when the live feed cannot be fetched.
  function loadSample(node) {
    var b64 = node.getAttribute('data-sample-b64');
    if (!b64) return null;
    try {
      return JSON.parse(atob(b64));
    } catch (e) {
      if (window.console) console.warn('[dba-runtime] bad data-sample-b64');
      return null;
    }
  }

  // Strip unresolved GAM macros left in data-* attrs (preview / misconfigured line).
  function cleanTargetingValue(v) {
    if (v == null) return '';
    v = String(v).trim();
    if (!v) return '';
    if (/^\[%[\w]+%\]$/.test(v)) return '';
    if (/^%%PATTERN:[\w]+%%$/.test(v)) return '';
    return v;
  }

  // ExtraLinks store Scope per format: Banner→InList AS, MPU→TopList AS,
  // Interstitial→(none). App often sets Scope to placement labels
  // (GameCenter, News, …) or the wrong list for the format — either miss
  // makes LinksManager return FALLBACK_BOOKIE_LINK_14 (e.g. 365_03387682).
  function placementFromFeed(base) {
    try {
      var m = String(base || '').match(/[?&]placment=([^&]*)/i);
      return m ? decodeURIComponent(m[1]).toLowerCase() : '';
    } catch (e) {
      return '';
    }
  }

  function normalizeScope(v, placement) {
    var s = cleanTargetingValue(v);
    if (!s) return '';
    var lower = s.toLowerCase();
    var p = String(placement || '').toLowerCase();
    if (p === 'mpu') return lower === 'toplist as' ? s : '';
    if (p === 'banner') return lower === 'inlist as' ? s : '';
    // Interstitial ExtraLinks have no Scope — never forward.
    if (p === 'interstitial') return '';
    if (lower === 'inlist as' || lower === 'toplist as') return s;
    return '';
  }

  // Prefer creative var OS_Type when set; else app key-value User_OS (always
  // sent as Android/iOS on device). LinksManager lowercases platform.
  function resolveOs(node) {
    var os = cleanTargetingValue(node.getAttribute('data-os'));
    if (!os) os = cleanTargetingValue(node.getAttribute('data-user-os'));
    if (!os) return '';
    var lower = os.toLowerCase();
    if (lower === '1' || lower === 'android') return 'android';
    if (lower === '2' || lower === 'ios' || lower === 'iphone' || lower === 'ipad') return 'ios';
    return os;
  }

  /**
   * Build GetPayload URL for Bet365 payload-feed creatives.
   * Encodes each targeting value (legacy dba_service_url parity) so AttNw /
   * AttCmp with spaces/parens still match LinksManager ExtraLinks.
   */
  function resolveFeedUrl(node) {
    var base = node.getAttribute('data-feed') || '';
    if (!base) return '';
    if (node.getAttribute('data-payload-feed') !== '1') return base;

    function add(url, name, value, skipEmpty) {
      var v = value == null ? '' : String(value);
      if (skipEmpty && !v) return url;
      var sep = url.indexOf('?') >= 0 ? '&' : '?';
      return url + sep + name + '=' + encodeURIComponent(v);
    }

    var url = base;
    url = add(url, 'os', resolveOs(node));
    url = add(url, 'network', cleanTargetingValue(node.getAttribute('data-network')));
    url = add(url, 'campaign', cleanTargetingValue(node.getAttribute('data-campaign')));
    url = add(url, 'price', cleanTargetingValue(node.getAttribute('data-price')));
    // ExtraLinks Ordering is Popularity|Live — default Popularity when unset.
    var order = cleanTargetingValue(node.getAttribute('data-order')) || 'Popularity';
    url = add(url, 'top_order_logic', order);
    url = add(url, 'maturity', cleanTargetingValue(node.getAttribute('data-maturity')));
    url = add(url, 'scope', normalizeScope(node.getAttribute('data-scope'), placementFromFeed(base)), true);
    url = add(url, 'competitors', cleanTargetingValue(node.getAttribute('data-competitors')));
    return url;
  }
  window.DbaResolveFeedUrl = resolveFeedUrl;

  // Find the clickable .ad anchor that wraps this matches node.
  function findAdAnchor(node) {
    var n = node;
    while (n && n !== document.body) {
      if (n.tagName === 'A' && n.classList && n.classList.contains('ad')) return n;
      n = n.parentNode;
    }
    return null;
  }

  // --- $GUID for non-Bet365 static cta_url only ---
  // Exact legacy formula (BetanoUtils.generate_guid / creative_template.html):
  //   CryptoJS.MD5(advertisingId + Date.now().toString()).toString()
  // Applied at click (fresh per click). Bet365 payload-link is never rewritten.
  // MD5: blueimp-md5 2.19.0 (same digest as CryptoJS / Node crypto for UTF-8).
  var md5hex = (function () {
    var root = {};
    !function(n){"use strict";function d(n,t){var r=(65535&n)+(65535&t);return(n>>16)+(t>>16)+(r>>16)<<16|65535&r}function f(n,t,r,e,o,u){return d((u=d(d(t,n),d(e,u)))<<o|u>>>32-o,r)}function l(n,t,r,e,o,u,c){return f(t&r|~t&e,n,t,o,u,c)}function g(n,t,r,e,o,u,c){return f(t&e|r&~e,n,t,o,u,c)}function v(n,t,r,e,o,u,c){return f(t^r^e,n,t,o,u,c)}function m(n,t,r,e,o,u,c){return f(r^(t|~e),n,t,o,u,c)}function c(n,t){var r,e,o,u;n[t>>5]|=128<<t%32,n[14+(t+64>>>9<<4)]=t;for(var c=1732584193,f=-271733879,i=-1732584194,a=271733878,h=0;h<n.length;h+=16)c=l(r=c,e=f,o=i,u=a,n[h],7,-680876936),a=l(a,c,f,i,n[h+1],12,-389564586),i=l(i,a,c,f,n[h+2],17,606105819),f=l(f,i,a,c,n[h+3],22,-1044525330),c=l(c,f,i,a,n[h+4],7,-176418897),a=l(a,c,f,i,n[h+5],12,1200080426),i=l(i,a,c,f,n[h+6],17,-1473231341),f=l(f,i,a,c,n[h+7],22,-45705983),c=l(c,f,i,a,n[h+8],7,1770035416),a=l(a,c,f,i,n[h+9],12,-1958414417),i=l(i,a,c,f,n[h+10],17,-42063),f=l(f,i,a,c,n[h+11],22,-1990404162),c=l(c,f,i,a,n[h+12],7,1804603682),a=l(a,c,f,i,n[h+13],12,-40341101),i=l(i,a,c,f,n[h+14],17,-1502002290),c=g(c,f=l(f,i,a,c,n[h+15],22,1236535329),i,a,n[h+1],5,-165796510),a=g(a,c,f,i,n[h+6],9,-1069501632),i=g(i,a,c,f,n[h+11],14,643717713),f=g(f,i,a,c,n[h],20,-373897302),c=g(c,f,i,a,n[h+5],5,-701558691),a=g(a,c,f,i,n[h+10],9,38016083),i=g(i,a,c,f,n[h+15],14,-660478335),f=g(f,i,a,c,n[h+4],20,-405537848),c=g(c,f,i,a,n[h+9],5,568446438),a=g(a,c,f,i,n[h+14],9,-1019803690),i=g(i,a,c,f,n[h+3],14,-187363961),f=g(f,i,a,c,n[h+8],20,1163531501),c=g(c,f,i,a,n[h+13],5,-1444681467),a=g(a,c,f,i,n[h+2],9,-51403784),i=g(i,a,c,f,n[h+7],14,1735328473),c=v(c,f=g(f,i,a,c,n[h+12],20,-1926607734),i,a,n[h+5],4,-378558),a=v(a,c,f,i,n[h+8],11,-2022574463),i=v(i,a,c,f,n[h+11],16,1839030562),f=v(f,i,a,c,n[h+14],23,-35309556),c=v(c,f,i,a,n[h+1],4,-1530992060),a=v(a,c,f,i,n[h+4],11,1272893353),i=v(i,a,c,f,n[h+7],16,-155497632),f=v(f,i,a,c,n[h+10],23,-1094730640),c=v(c,f,i,a,n[h+13],4,681279174),a=v(a,c,f,i,n[h],11,-358537222),i=v(i,a,c,f,n[h+3],16,-722521979),f=v(f,i,a,c,n[h+6],23,76029189),c=v(c,f,i,a,n[h+9],4,-640364487),a=v(a,c,f,i,n[h+12],11,-421815835),i=v(i,a,c,f,n[h+15],16,530742520),c=m(c,f=v(f,i,a,c,n[h+2],23,-995338651),i,a,n[h],6,-198630844),a=m(a,c,f,i,n[h+7],10,1126891415),i=m(i,a,c,f,n[h+14],15,-1416354905),f=m(f,i,a,c,n[h+5],21,-57434055),c=m(c,f,i,a,n[h+12],6,1700485571),a=m(a,c,f,i,n[h+3],10,-1894986606),i=m(i,a,c,f,n[h+10],15,-1051523),f=m(f,i,a,c,n[h+1],21,-2054922799),c=m(c,f,i,a,n[h+8],6,1873313359),a=m(a,c,f,i,n[h+15],10,-30611744),i=m(i,a,c,f,n[h+6],15,-1560198380),f=m(f,i,a,c,n[h+13],21,1309151649),c=m(c,f,i,a,n[h+4],6,-145523070),a=m(a,c,f,i,n[h+11],10,-1120210379),i=m(i,a,c,f,n[h+2],15,718787259),f=m(f,i,a,c,n[h+9],21,-343485551),c=d(c,r),f=d(f,e),i=d(i,o),a=d(a,u);return[c,f,i,a]}function i(n){for(var t="",r=32*n.length,e=0;e<r;e+=8)t+=String.fromCharCode(n[e>>5]>>>e%32&255);return t}function a(n){var t=[];for(t[(n.length>>2)-1]=void 0,e=0;e<t.length;e+=1)t[e]=0;for(var r=8*n.length,e=0;e<r;e+=8)t[e>>5]|=(255&n.charCodeAt(e/8))<<e%32;return t}function e(n){for(var t,r="0123456789abcdef",e="",o=0;o<n.length;o+=1)t=n.charCodeAt(o),e+=r.charAt(t>>>4&15)+r.charAt(15&t);return e}function r(n){return unescape(encodeURIComponent(n))}function o(n){return i(c(a(n=r(n)),8*n.length))}function u(n,t){return function(n,t){var r,e=a(n),o=[],u=[];for(o[15]=u[15]=void 0,16<e.length&&(e=c(e,8*n.length)),r=0;r<16;r+=1)o[r]=909522486^e[r],u[r]=1549556828^e[r];return t=c(o.concat(a(t)),512+8*t.length),i(c(u.concat(t),640))}(r(n),r(t))}function t(n,t,r){return t?r?u(t,n):e(u(t,n)):r?o(n):e(o(n))}n.md5=t}(root);
    return function (s) { return root.md5(String(s == null ? '' : s)); };
  }());

  // Legacy: hash_str = adid + Date.now().toString(); return CryptoJS.MD5(hash_str).toString();
  function generateClickGuid(adid) {
    return md5hex(String(adid == null ? '' : adid) + Date.now().toString());
  }

  function replaceGuidInUrl(url, guid) {
    if (!url || guid == null) return url || '';
    return String(url).replace(/\$GUID/gi, guid);
  }

  /**
   * Non-Bet365 only: keep cta template with $GUID; on each click fill with
   * generateClickGuid(advId) — same formula as legacy 1X2 creative.
   */
  function wireStaticCtaGuidClicks() {
    var ads = document.querySelectorAll('a.ad[data-cta-url]');
    for (var i = 0; i < ads.length; i++) {
      (function (ad) {
        if (ad.getAttribute('data-payload-link') === '1') return;
        if (ad.__dbaGuidClickWired) return;

        var cta = ad.getAttribute('data-cta-url') || '';
        var href = ad.getAttribute('href') || '';
        if (cta.indexOf('$GUID') === -1 && cta.indexOf('$guid') === -1
            && href.indexOf('$GUID') === -1 && href.indexOf('$guid') === -1) {
          return;
        }

        // Preserve template; derive GAM click-tracker prefix once.
        var template = cta || href;
        var prefix = '';
        if (cta && href.indexOf(cta) !== -1) {
          prefix = href.substring(0, href.lastIndexOf(cta));
        }
        ad.setAttribute('data-cta-template', template);
        ad.setAttribute('data-click-prefix', prefix);
        ad.__dbaGuidClickWired = true;

        ad.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var tpl = ad.getAttribute('data-cta-template') || '';
          // One guid per impression (not per click) so the affiliate click and
          // the dba_ad_view event carry the same value — legacy body.onload.
          var dest = replaceGuidInUrl(tpl, impressionGuid(ad));
          var tracker = ad.getAttribute('data-click-prefix') || '';
          window.open(tracker + dest, '_blank');
        });
      }(ads[i]));
    }
  }
  window.DbaWireStaticCtaGuidClicks = wireStaticCtaGuidClicks;
  // Back-compat alias (older call sites / docs).
  window.DbaApplyStaticCtaGuidPlaceholders = wireStaticCtaGuidClicks;

  // Payload-link creatives (Bet365 / legacy getClickURL case 14): store
  // Bookie.Link; click handler opens tracker + encodeURIComponent(link).
  // Static cta_url creatives keep baked href unless this is an older Bet365
  // snippet that still used data-cta-url (href rewrite below).
  function applyBookieLinkFromPayload(node, data) {
    if (!data || !data.Bookie) return;
    var bookie = data.Bookie;
    var bmid = parseInt(bookie.ID, 10);
    var link = bookie.Link;
    if (!link) return;

    var ad = findAdAnchor(node);
    if (!ad) return;

    if (ad.getAttribute('data-payload-link') === '1') {
      ad.setAttribute('data-bookie-link', link);
      return;
    }

    // Legacy Bet365 snippets that still bake a static cta_url.
    if (bmid !== 14) return;
    ad.setAttribute('data-bookie-link', link);
    if (ad.getAttribute('data-cta-url') != null) {
      var fallback = ad.getAttribute('data-cta-url') || '';
      var href = ad.getAttribute('href') || '';
      var tracker = '';
      if (fallback && href.indexOf(fallback) !== -1) {
        tracker = href.substring(0, href.lastIndexOf(fallback));
      }
      ad.setAttribute('href', tracker ? (tracker + encodeURIComponent(link)) : link);
    }
  }

  function wirePayloadLinkClicks() {
    var ads = document.querySelectorAll('a.ad[data-payload-link="1"]');
    for (var i = 0; i < ads.length; i++) {
      (function (ad) {
        if (ad.__dbaPayloadClickWired) return;
        ad.__dbaPayloadClickWired = true;
        ad.addEventListener('click', function (e) {
          var link = ad.getAttribute('data-bookie-link');
          if (!link) return; // feed not ready yet — ignore / keep #
          e.preventDefault();
          e.stopPropagation();
          var tracker = ad.getAttribute('data-click-tracker') || '';
          window.open(tracker + encodeURIComponent(link), '_blank');
        });
      }(ads[i]));
    }
  }

  function onFeedPayload(node, data) {
    applyBookieLinkFromPayload(node, data);
    wirePayloadLinkClicks();
  }
  window.DbaOnFeedPayload = onFeedPayload;
  window.DbaWirePayloadLinkClicks = wirePayloadLinkClicks;

  // --- BI: dba_ad_view -----------------------------------------------------
  // Field-for-field parity with the legacy 1X2 creative (betano-utils.js
  // create_event_object / send_event). The dimensions are baked onto the ad
  // anchor at export from the same values that build feed_url, so a creative
  // can no longer report a bookmaker it is not actually serving — the legacy
  // creative read bmid from a hand-set "Bookmaker" CreativeTemplate variable.
  // Never write GAM macro syntax in this file: the runtime is inlined into the
  // snippet, and GAM resolves the macro even inside a comment.
  var BI_SDK_URL = 'https://staticaws.365scores.com/BettingAds/1X2/V1/tools/kinesis/aws-sdk-2.756.0.min.js';
  var BI_STREAM = 'ads_events';
  var BI_REGION = 'us-east-1';
  var BI_IDENTITY_POOL = 'us-east-1:01115446-95f7-460b-9d7d-88ff0f3ead7a';
  var BI_TABLE = '365.public.fact_events_ads';
  // Legacy create_and_send_event samples Bet365 at 10% and sends the rest at
  // 100%. Same rate here, otherwise bmid 14 volumes jump 10x at cutover.
  var BI_SAMPLED_BMID = 14;
  var BI_SAMPLE_RATE = 0.1;

  // hashed_device_id: the app packs it into 15 team key-values, each 3-letter
  // code standing for one character (legacy EncodingChars, verbatim).
  var BI_ENCODING_CHARS = {"MTA":"0","LEE":"1","ARS":"2","FLU":"3","TOT":"4","FOR":"5","LAK":"6","ROM":"7","BRU":"8","CRZ":"9","AVL":"A","BHA":"B","LAX":"C","DOR":"D","EVE":"E","FUL":"F","PHI":"G","HUL":"H","INT":"I","JUV":"J","OAK":"K","RMA":"L","MCI":"M","NEW":"N","OLY":"O","PNE":"P","REA":"Q","UTA":"R","BOU":"S","STS":"T","QPR":"U","TBL":"V","CHE":"W","LAG":"X","WOL":"Y","GSW":"Z","NYG":"0","NYJ":"1","CEA":"2","MIN":"3","AGO":"4","CHI":"5","GRE":"6","TBG":"7","STL":"8","SFN":"9","DET":"A","NEP":"B","JAX":"C","BUF":"D","GIL":"E","HOU":"F","CBJ":"G","GUA":"H","CLB":"I","IND":"J","KCX":"K","CHL":"L","MTL":"M","NSH":"N","NOT":"O","PIT":"P","LAR":"Q","RBL":"R","CRY":"S","VIT":"T","PHX":"U","VEG":"V","BKN":"W","DAL":"X","NYI":"Y","WAS":"Z","FCB":"0","WAT":"1","FLA":"2","MAD":"3","CSK":"4","GOI":"5","CHA":"6","SEV":"7","BAR":"8","PON":"9","SAO":"A","BOT":"B","RMF":"C","BOL":"D","BAH":"E","ESP":"F","LAC":"G","INL":"H","MIL":"I","LAL":"J","BVB":"K","MCT":"L","LYO":"M","OKC":"N","LEI":"O","VAL":"P","NAP":"Q","QUE":"R","SHU":"S","WBA":"T","USA":"U","WHU":"V","LFC":"W","FIO":"X","ORL":"Y","MEM":"Z","BRE":"0","ENG":"1","ACM":"2","CTH":"3","BAY":"4","NOP":"5","PAL":"6","SCP":"7","SJS":"8","RBB":"9","PSG":"A","ATM":"B","LYN":"C","TFC":"D","NIZ":"E","LEO":"F","AJA":"G","OLM":"H","SSC":"I","SHA":"J","FRK":"K","HAC":"L","MUN":"M","NAN":"N","SCF":"O","POR":"P","LOS":"Q","LIV":"R","BES":"S","FCN":"T","VIE":"U","VCF":"V","SOU":"W","TOR":"X","YOK":"Y","ZWO":"Z"};

  // Also strips bare percent-macro forms (advertising id) that
  // cleanTargetingValue keeps.
  function biClean(v) {
    v = cleanTargetingValue(v);
    return /^%%[\w:]+%%$/.test(v) ? '' : v;
  }

  function biDecodeUid(csv) {
    var out = '';
    var parts = String(csv || '').split(',');
    for (var i = 0; i < parts.length; i++) {
      var code = biClean(parts[i]);
      if (Object.prototype.hasOwnProperty.call(BI_ENCODING_CHARS, code)) {
        out += BI_ENCODING_CHARS[code];
      }
    }
    return out.toLowerCase();
  }

  /**
   * One guid per impression, shared by the view event and the click URL, so
   * views and clicks can be joined (legacy generated it once in body.onload).
   */
  function impressionGuid(ad) {
    if (!ad.__dbaImpressionGuid) {
      ad.__dbaImpressionGuid = generateClickGuid(biClean(ad.getAttribute('data-adv-id'))
        || biClean(ad.getAttribute('data-bi-adv-id')));
    }
    return ad.__dbaImpressionGuid;
  }

  function biClickUrl(ad) {
    if (ad.getAttribute('data-payload-link') === '1') {
      // Bookie.Link is only known once the feed resolves; empty until then.
      return biClean(ad.getAttribute('data-bookie-link'));
    }
    var tpl = ad.getAttribute('data-cta-template') || ad.getAttribute('data-cta-url') || '';
    return replaceGuidInUrl(tpl, impressionGuid(ad));
  }

  function biLoadSdk(cb) {
    if (window.AWS) { cb(); return; }
    if (window.__dbaBiSdkLoading) { window.__dbaBiSdkLoading.push(cb); return; }
    window.__dbaBiSdkLoading = [cb];
    var s = document.createElement('script');
    s.src = BI_SDK_URL;
    s.async = true;
    s.onload = function () {
      var queued = window.__dbaBiSdkLoading || [];
      window.__dbaBiSdkLoading = null;
      for (var i = 0; i < queued.length; i++) {
        try { queued[i](); } catch (e) { /* one bad send must not block others */ }
      }
    };
    s.onerror = function () { window.__dbaBiSdkLoading = null; };
    (document.head || document.body || document.documentElement).appendChild(s);
  }

  function biSend(params) {
    biLoadSdk(function () {
      var aws = window.AWS;
      if (!aws) return;
      if (!aws.config.region) {
        aws.config.update({
          region: BI_REGION,
          credentials: new aws.CognitoIdentityCredentials({ IdentityPoolId: BI_IDENTITY_POOL }),
        });
      }
      var event = { event_name: 'dba_ad_view', datekey: Date.now(), table: BI_TABLE };
      var values = {};
      for (var key in params) {
        if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
        event[key] = params[key];
        values[key] = params[key];
      }
      event.event_values = values;
      try {
        new aws.Kinesis().putRecords({
          Records: [{ PartitionKey: String(params.guid), Data: JSON.stringify(event) }],
          StreamName: BI_STREAM,
        }, function (err) {
          if (err && window.console) console.warn('[dba-runtime] bi failed:', err.message);
        });
      } catch (e) {
        if (window.console) console.warn('[dba-runtime] bi failed:', e && e.message);
      }
    });
  }

  /** Fires once per creative load — same trigger as legacy document.body.onload. */
  function emitAdView() {
    if (window.__DBA_DISABLE_BI) return;
    var ads = document.querySelectorAll('a.ad[data-bi="1"]');
    for (var i = 0; i < ads.length; i++) {
      (function (ad) {
        if (ad.__dbaAdViewSent) return;
        ad.__dbaAdViewSent = true;

        var bmid = parseInt(ad.getAttribute('data-bi-bmid'), 10);
        if (!isFinite(bmid)) return;
        if (bmid === BI_SAMPLED_BMID && Math.random() > BI_SAMPLE_RATE) return;

        biSend({
          bmid: bmid,
          adid: biClean(ad.getAttribute('data-bi-adv-id')),
          country: parseInt(ad.getAttribute('data-bi-country'), 10),
          language: parseInt(ad.getAttribute('data-bi-lang'), 10),
          att_nw: biClean(ad.getAttribute('data-bi-network')),
          att_cmp: biClean(ad.getAttribute('data-bi-campaign')),
          format: biClean(ad.getAttribute('data-bi-format')),
          user_maturity_wk: biClean(ad.getAttribute('data-bi-maturity')),
          offer: biClean(ad.getAttribute('data-bi-offer')),
          price: biClean(ad.getAttribute('data-bi-price')),
          scope: biClean(ad.getAttribute('data-bi-scope')),
          ordering: biClean(ad.getAttribute('data-bi-ordering')),
          os_type: biClean(ad.getAttribute('data-bi-os')),
          hashed_device_id: biDecodeUid(ad.getAttribute('data-bi-uid')),
          guid: impressionGuid(ad),
          click_url: biClickUrl(ad),
        });
      }(ads[i]));
    }
  }
  window.DbaEmitAdView = emitAdView;

  function autoRender() {
    emitAdView();
    wireStaticCtaGuidClicks();
    if (window.__DBA_SKIP_AUTORENDER) {
      wirePayloadLinkClicks();
      return;
    }
    var nodes = document.querySelectorAll(ROOT_SEL);
    if (!nodes.length) {
      wirePayloadLinkClicks();
      return;
    }
    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        var sample = loadSample(node);
        if (sample) {
          render(node, sample);
          onFeedPayload(node, sample);
        }

        var feed = resolveFeedUrl(node);
        if (!feed) return;
        fetch(feed, { credentials: 'omit' })
          .then(function (r) {
            if (!r.ok) return null;
            return r.text().then(function (t) {
              if (!t || String(t).trim() === 'No Games') return null;
              try { return JSON.parse(t); } catch (e) { return null; }
            });
          })
          .then(function (data) {
            if (!data) return;
            onFeedPayload(node, data);
            if (filterUpcoming(extractMatches(data)).length) render(node, data);
          })
          .catch(function (err) {
            if (window.console) console.warn('[dba-runtime] feed failed:', err && err.message);
            if (!sample && loadSample(node)) render(node, loadSample(node));
          });
      }(nodes[i]));
    }
    wirePayloadLinkClicks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoRender);
  } else {
    autoRender();
  }
}());
