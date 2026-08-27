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
      /* Each slide is one viewport wide. Track width is set in JS to
         (slideCount * 100%) so translateX(-pos/slideCount * 100%) moves
         exactly one slide — matching AdPreview MatchCarouselViewport. */ +
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
      /* Slot takes leftover width; name shrink-wraps toward the crest. */ +
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
      /* Brazil MPU densify — scoped under .ad-stack so interstitial/banner
         legal-band creatives are not crushed by MPU flex/CTA rules. */ +
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
      /* Banner (320×50): flat match block — no card chrome. Mirrors AdPreview
         BannerMatchSection. Activated via data-layout="banner" on .matches. */ +
      '.matches[data-layout="banner"] { display: flex; align-items: stretch; overflow: hidden; }' +
      '.matches[data-layout="banner"] .dba-track { height: 100%; }' +
      '.matches[data-layout="banner"] .dba-slide { gap: 0; justify-content: flex-start; height: 100%; overflow: hidden; }' +
      '.matches[data-layout="banner"] .dba-card {' +
        'background: transparent; border: none; border-radius: 0; padding: 0;' +
        'display: flex; flex-direction: column; align-items: stretch;' +
        'justify-content: flex-start; gap: 3px; height: 100%; box-sizing: border-box;' +
        'position: relative; overflow: hidden;' +
      '}' +
      /* Pill sits in a fixed-height anchor; equal gaps come from card gap (not flex). */ +
      '.matches[data-layout="banner"] .dba-pill-anchor {' +
        'display: block; position: relative; height: 14px; flex-shrink: 0;' +
      '}' +
      '.matches[data-layout="banner"] .dba-pill {' +
        'position: absolute; top: 0; left: 50%; transform: translateX(-50%);' +
        'height: 100%; box-sizing: border-box; padding: 0 6px; margin: 0;' +
        'display: inline-flex; align-items: center; justify-content: center;' +
        'font-size: 8px; font-weight: 600; line-height: 1; white-space: nowrap;' +
      '}' +
      /* Hide flex spacers on banner — fixed gap on .dba-card equalizes instead. */ +
      '.matches[data-layout="banner"] .dba-v-gap { display: none; }' +
      '.matches[data-layout="banner"] .dba-teams {' +
        'position: relative; justify-content: center; gap: 0; margin-top: 0; font-size: 11px;' +
        'flex-shrink: 0; width: 100%; min-width: 0; min-height: 11px;' +
      '}' +
      /* Absolute halves around a banner-centred X (positions set in JS). */ +
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
      /* Banner + Brazil legal band: denser metrics (BANNER.brazil.match). */ +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-card { gap: 2px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-pill-anchor { height: 9px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-pill { padding: 0 3px; font-size: 6.6px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-teams { gap: 2px; font-size: 8.5px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-team-logo { width: 10.35px; height: 10.35px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-x { font-size: 8.5px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-odds { height: 9px; font-size: 7px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-odd-label { font-size: 5.5px; }' +
      /* Interstitial — fill middle band; card type scales with computed card height. */ +
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
        'border-radius: 1.4em; padding: 0.7em 3.5% 0.75em; gap: 0.65em; overflow: hidden;' +
        'display: flex; flex-direction: column; justify-content: center;' +
      '}' +
      /* Spacers (not margins) — GAM WebViews let margin-top overflow under the CTA. */ +
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
      '.matches[data-layout="interstitial"] .dba-teams {' +
        'flex: 0 0 auto; min-height: var(--dba-int-crest, 48px); gap: 0; margin-top: 0;' +
        'font-size: var(--dba-int-team, 8em); font-weight: 600; align-items: center;' +
        'display: flex; width: 100%; line-height: 1.15; overflow: visible;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-teamblock {' +
        'flex: 1 1 0; min-width: 0; width: 0; gap: 0;' +
        'display: flex; align-items: center;' +
      '}' +
      /* Name sits in the free space between crest and vs, centred. */ +
      '.matches[data-layout="interstitial"] .dba-teamblock-home { justify-content: flex-start; }' +
      '.matches[data-layout="interstitial"] .dba-teamblock-away { justify-content: flex-end; }' +
      /* Crests: fixed px from card height (not % — collapses / clips in GAM WebViews). */ +
      '.ad-shell .matches[data-layout="interstitial"] .dba-team-logo {' +
        'flex: 0 0 var(--dba-int-crest, 48px) !important; width: var(--dba-int-crest, 48px) !important;' +
        'height: var(--dba-int-crest, 48px) !important; max-width: var(--dba-int-crest, 48px) !important;' +
        'max-height: var(--dba-int-crest, 48px) !important;' +
        'object-fit: contain; border-radius: 50%; background: rgba(255,255,255,0.08);' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-team-logo {' +
        'flex: 0 0 var(--dba-int-crest, 48px); width: var(--dba-int-crest, 48px); height: var(--dba-int-crest, 48px);' +
        'max-width: var(--dba-int-crest, 48px); max-height: var(--dba-int-crest, 48px);' +
        'object-fit: contain; border-radius: 50%; background: rgba(255,255,255,0.08);' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-teamblock-home .dba-team-logo { margin-right: 0; }' +
      '.matches[data-layout="interstitial"] .dba-teamblock-away .dba-team-logo { margin-left: 0; }' +
      '.matches[data-layout="interstitial"] .dba-team-name-slot {' +
        'flex: 1 1 0; min-width: 0; overflow: hidden;' +
        'display: flex; align-items: center; justify-content: center; text-align: center;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-teamblock-home .dba-team-name-slot { justify-content: center; text-align: center; }' +
      '.matches[data-layout="interstitial"] .dba-teamblock-away .dba-team-name-slot { justify-content: center; text-align: center; }' +
      '.matches[data-layout="interstitial"] .dba-team-name {' +
        'display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;' +
        'overflow-wrap: normal; word-break: normal; line-height: 1.15;' +
        'max-width: 100%; min-width: 0; font-size: 1em; color: inherit; text-align: center;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-x {' +
        'flex: 0 0 auto; font-size: 0.85em; font-weight: 700;' +
        'margin: 0 1.5%; opacity: 0.75; letter-spacing: 0.02em;' +
        'text-transform: lowercase; line-height: 1;' +
      '}' +
      /* Odds mirror teams row: same 1fr | vs | 1fr centre column so X sits under vs. */ +
      '.matches[data-layout="interstitial"] .dba-odds {' +
        'margin-top: 0.2em; font-size: var(--dba-int-odds, 4.8em); flex: 0 0 auto; font-weight: 700;' +
        'display: flex; align-items: center; width: 100%; min-width: 0;' +
        'overflow: visible;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd-slot {' +
        'font-size: inherit; min-width: 0; overflow: visible;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd-slot-home {' +
        'flex: 1 1 0; justify-content: flex-end;' +
        'padding-right: calc(var(--dba-int-crest, 32px) + 6px); padding-left: 0;' +
        'box-sizing: border-box;' +
      '}' +
      /* Hidden "vs" spacer matches .dba-x width/margins; X odds centred on it. */ +
      '.matches[data-layout="interstitial"] .dba-odd-slot-draw {' +
        'position: relative; flex: 0 0 auto; margin: 0 1.5%;' +
        'font-size: inherit; font-weight: 700; line-height: 1;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd-slot-draw:before {' +
        'content: "vs"; visibility: hidden; display: inline-block;' +
        /* vs spacer tracks --dba-int-team / --dba-int-odds */ +
        'font-size: 1.35em; font-weight: 700; letter-spacing: 0.02em;' +
        'text-transform: lowercase; line-height: 1;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd-slot-draw .dba-odd {' +
        'position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd-slot-away {' +
        'flex: 1 1 0; justify-content: flex-start;' +
        'padding-left: calc(var(--dba-int-crest, 32px) + 6px); padding-right: 0;' +
        'box-sizing: border-box;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd {' +
        'gap: 0.35em; font-size: 1em; white-space: nowrap;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd-label { font-size: 0.62em; font-weight: 800; color: #FFC107; }' +
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
      /* Carousel page indicator — on .ad-shell (outside click <a>) for GAM. */ +
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

    var vsText = layout === 'interstitial' ? 'vs' : '\u2013';

    return el('div', { 'class': 'dba-card' }, [
      el('div', { 'class': 'dba-pill-anchor' }, [
        el('div', { 'class': 'dba-pill' }, [
          el('span', { 'class': 'dba-pill-text', text: pillText }),
        ]),
      ]),
      el('div', { 'class': 'dba-v-gap' }),
      el('div', { 'class': 'dba-teams' }, [
        teamBlock(comps[0], 'home'),
        el('span', { 'class': 'dba-x', text: vsText }),
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
    /* Width-primary type; odds always smaller than team names. */
    var team = Math.round(w * 0.046);
    team = Math.max(20, Math.min(team, Math.round(cardH * 0.155)));
    var crest = Math.round(w * 0.057);
    crest = Math.max(29, Math.min(crest, Math.round(cardH * 0.24)));
    var pill = Math.max(13, Math.round(w * 0.026));
    var odds = Math.max(15, Math.min(Math.round(team * 0.74), team - 3));
    shell.style.setProperty('--dba-int-team', team + 'px');
    shell.style.setProperty('--dba-int-crest', crest + 'px');
    shell.style.setProperty('--dba-int-pill', pill + 'px');
    shell.style.setProperty('--dba-int-odds', odds + 'px');
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

  function applyInterstitialLogoLayout(shell, w) {
    if (!shell || w < 1) return;
    var ad = shell.querySelector('.ad');
    if (!ad) return;
    var logoWrap = ad.querySelector('.logo-wrap');
    var logo = ad.querySelector('.logo');
    var logoSize = Math.round(w * 0.33);
    if (logoWrap) {
      logoWrap.style.flex = '0 0 auto';
      logoWrap.style.minHeight = logoSize + 'px';
      logoWrap.style.overflow = 'visible';
    }
    if (logo) {
      logo.style.width = logoSize + 'px';
      logo.style.height = logoSize + 'px';
      logo.style.maxWidth = logoSize + 'px';
      logo.style.flexShrink = '0';
    }
  }

  function applyLegalBandMetrics(shell, h) {
    if (!shell || !shell.classList.contains('legal-band')) return 0;
    var minLegal = Math.round(h * 0.10);
    shell.style.setProperty('--dba-shell-h', h + 'px');
    shell.style.setProperty('--dba-legal-h', minLegal + 'px');
    shell.style.setProperty('--dba-legal-font', Math.max(14, Math.round(h * 0.016)) + 'px');
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
    var unit = interstitial ? (w * 0.0105) : (Math.min(w, h / 1.5) * 0.01);
    shell.style.fontSize = unit + 'px';
    var cardGapPx = Math.round(h * 0.045);
    var tightGapPx = Math.round(h * 0.034);
    shell.style.setProperty('--dba-card-gap', cardGapPx + 'px');
    shell.style.setProperty('--dba-card-gap-tight', tightGapPx + 'px');
    if (interstitial) applyInterstitialLogoLayout(shell, w);
    if (shell.classList.contains('legal-band')) {
      applyLegalBandMetrics(shell, h);
    }
    return { cardGapPx: cardGapPx, tightGapPx: tightGapPx, legalBand: shell.classList.contains('legal-band'), shellH: h, shellW: w };
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
    /* Cards ~27% of width (bwin reference +10%); gaps scale with cards. */
    var maxCardH = Math.round(shellW * 0.27);

    if (slides.length) {
      n = slides[0].querySelectorAll('.dba-card').length;
      gapPx = n > 1 ? Math.max(18, Math.min(28, Math.round(shellW * 0.038))) : 0;
      cardH = Math.max(64, Math.min(maxCardH, Math.floor((avail - gapPx * Math.max(0, n - 1)) / Math.max(1, n))));
      appliedGap = gapPx;
    }

    root.style.flex = '1 1 0';
    root.style.height = 'auto';
    root.style.maxHeight = 'none';
    root.style.minHeight = '0';
    root.style.margin = '0';

    if (n > 0) crestPx = applyInterstitialTypeScale(shell, cardH, shellW);

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
    node.style.setProperty('--dba-pill-bg', bg || 'transparent');
    if (fg) node.style.setProperty('--dba-pill-fg', fg);
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

  function autoRender() {
    if (window.__DBA_SKIP_AUTORENDER) return;
    var nodes = document.querySelectorAll(ROOT_SEL);
    if (!nodes.length) return;
    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        var sample = loadSample(node);
        // Paint sample immediately so GAM / SafeFrame previews show cards
        // even when the live feed is blocked or slow.
        if (sample) render(node, sample);

        var feed = node.getAttribute('data-feed');
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
            if (data && filterUpcoming(extractMatches(data)).length) render(node, data);
          })
          .catch(function (err) {
            if (window.console) console.warn('[dba-runtime] feed failed:', err && err.message);
            if (!sample && loadSample(node)) render(node, loadSample(node));
          });
      }(nodes[i]));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoRender);
  } else {
    autoRender();
  }
}());
