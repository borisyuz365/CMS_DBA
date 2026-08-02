// DBA Runtime — renders match cards into GAM creatives.
//
// The GAM creative template (mpu-standard.html etc.) embeds this script via
// `<script src="[%runtime_url%]" defer>`. On load it finds every
// `.matches[data-feed]` node, fetches its feed JSON, and renders an
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

  // Cloudinary team-logo source. 36×36 = 2× retina for the 18 px display box;
  // c_limit means "no upscale"; d_countries:default.png yields a transparent
  // placeholder when a team has no logo configured.
  var TEAM_LOGO_BASE = 'https://res.cloudinary.com/scores365/image/upload/w_36,h_36,c_limit,d_countries:default.png/Competitors/';

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

  // One side of the matchup. Layout mirrors across the X divider —
  // home: [name][logo] · X · away: [logo][name].
  function teamBlock(comp, side) {
    var name = (comp && (comp.SName || comp.Name || comp.name)) || '';
    var id = comp && (comp.ID != null ? comp.ID : comp.id);
    var url = teamLogoUrl(id);
    var children = [];
    var logoEl;
    if (side === 'home') {
      children.push(el('span', { 'class': 'dba-team-name', text: name }));
      if (url) {
        logoEl = el('img', { 'class': 'dba-team-logo', src: url, alt: '' });
        children.push(logoEl);
      }
    } else {
      if (url) {
        logoEl = el('img', { 'class': 'dba-team-logo', src: url, alt: '' });
        children.push(logoEl);
      }
      children.push(el('span', { 'class': 'dba-team-name', text: name }));
    }
    var node = el('div', { 'class': 'dba-teamblock dba-teamblock-' + side }, children);
    // Hide on 404 so the team name stays clean instead of a broken-image icon.
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

  function injectStyles() {
    if (document.getElementById('dba-runtime-styles')) return;
    // Scoped under .matches so the creative's outer .ad styles own
    // positioning/typography. Visual tuning should track AdPreview.jsx's MPU
    // MatchRow and the carousel viewport sizing in mpu-standard.html.
    var css =
      '.matches .dba-track { display: flex; height: 100%; }' +
      '.matches .dba-slide { flex: 0 0 100%; width: 100%; display: flex; flex-direction: column; gap: 4px; box-sizing: border-box; }' +
      '.matches .dba-card { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 11px 12px 7px; position: relative; }' +
      '.matches .dba-pill { position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.55); color: #fff; padding: 2px 6px; border-radius: 999px; font-size: 9px; font-weight: 600; line-height: 1; white-space: nowrap; }' +
      '.matches .dba-teams { display: flex; align-items: center; gap: 6px; margin-top: 5px; font-size: 10px; font-weight: 600; min-width: 0; }' +
      '.matches .dba-teamblock { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0; }' +
      '.matches .dba-teamblock-home { justify-content: flex-end; }' +
      '.matches .dba-teamblock-away { justify-content: flex-start; }' +
      '.matches .dba-team-logo { width: 18px; height: 18px; flex: 0 0 auto; object-fit: contain; border-radius: 50%; background: rgba(255,255,255,0.08); }' +
      '.matches .dba-team-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.matches .dba-x { font-size: 11px; font-weight: 700; opacity: 0.65; flex: 0 0 auto; }' +
      '.matches .dba-odds { display: flex; justify-content: space-around; gap: 12px; margin-top: 5px; font-size: 11px; font-weight: 700; }' +
      '.matches .dba-odd { display: inline-flex; align-items: center; gap: 6px; }' +
      '.matches .dba-odd:before { content: ""; display: inline-block; width: 5px; height: 5px; border-radius: 999px; background: #FFC107; }' +
      /* Brazil MPU: slightly denser cards so they clear the CTA (AdPreview). */ +
      '.ad:has(.legal-band) .matches .dba-slide { gap: 8px; }' +
      '.ad:has(.legal-band) .matches .dba-card { border-radius: 11px; padding: 10px 10px 7px; }' +
      '.ad:has(.legal-band) .matches .dba-pill { top: -7px; padding: 2px 5px; font-size: 8px; }' +
      '.ad:has(.legal-band) .matches .dba-teams { gap: 5px; margin-top: 4px; font-size: 10px; }' +
      '.ad:has(.legal-band) .matches .dba-team-logo { width: 15px; height: 15px; }' +
      '.ad:has(.legal-band) .matches .dba-x { font-size: 10px; }' +
      '.ad:has(.legal-band) .matches .dba-odds { gap: 10px; margin-top: 3px; font-size: 10px; }' +
      '.ad:has(.legal-band) .matches .dba-odd { gap: 4px; }' +
      '.ad:has(.legal-band) .matches .dba-odd:before { width: 4px; height: 4px; }' +
      /* Banner (320×50): flat match block — no card chrome. Mirrors AdPreview
         BannerMatchSection. Activated via data-layout="banner" on .matches. */ +
      '.matches[data-layout="banner"] { display: flex; align-items: center; }' +
      '.matches[data-layout="banner"] .dba-track { width: 100%; height: auto; }' +
      '.matches[data-layout="banner"] .dba-slide { gap: 0; justify-content: center; }' +
      '.matches[data-layout="banner"] .dba-card {' +
        'background: transparent; border: none; border-radius: 0; padding: 0;' +
        'display: flex; flex-direction: column; align-items: stretch; gap: 2px;' +
      '}' +
      '.matches[data-layout="banner"] .dba-card { position: relative; padding-top: 12px; }' +
      '.matches[data-layout="banner"] .dba-pill {' +
        'position: absolute; top: 0; left: 50%; transform: translateX(-50%);' +
        'padding: 2px 6px; font-size: 8px; white-space: nowrap;' +
      '}' +
      '.matches[data-layout="banner"] .dba-teams {' +
        'justify-content: center; gap: 4px; margin-top: 0; font-size: 10px;' +
      '}' +
      '.matches[data-layout="banner"] .dba-teamblock { flex: 0 1 auto; }' +
      '.matches[data-layout="banner"] .dba-team-logo { width: 11px; height: 11px; }' +
      '.matches[data-layout="banner"] .dba-x { font-size: 10px; opacity: 0.6; }' +
      '.matches[data-layout="banner"] .dba-odds {' +
        'justify-content: center; gap: 10px; margin-top: 0; font-size: 9px;' +
      '}' +
      '.matches[data-layout="banner"] .dba-odd { gap: 2px; }' +
      '.matches[data-layout="banner"] .dba-odd:before { width: 3px; height: 3px; }' +
      /* Banner + Brazil legal band: denser metrics (BANNER.brazil.match). */ +
      '.ad:has(.legal-band) .matches[data-layout="banner"] .dba-card { gap: 1px; }' +
      '.ad:has(.legal-band) .matches[data-layout="banner"] .dba-pill { padding: 1px 3px; font-size: 6.6px; }' +
      '.ad:has(.legal-band) .matches[data-layout="banner"] .dba-teams { gap: 2px; font-size: 7.7px; }' +
      '.ad:has(.legal-band) .matches[data-layout="banner"] .dba-team-logo { width: 9px; height: 9px; }' +
      '.ad:has(.legal-band) .matches[data-layout="banner"] .dba-x { font-size: 7.7px; }' +
      '.ad:has(.legal-band) .matches[data-layout="banner"] .dba-odds { gap: 6px; font-size: 7.7px; }' +
      '.ad:has(.legal-band) .matches[data-layout="banner"] .dba-odd:before { width: 2px; height: 2px; }' +
      /* Interstitial (640×1280): large cards, 3 per slide. Mirrors AdPreview
         MatchRow interstitial metrics. data-layout="interstitial". */ +
      '.matches[data-layout="interstitial"] .dba-slide { gap: 56px; }' +
      '.matches[data-layout="interstitial"] .dba-card {' +
        'border-radius: 36px; padding: 40px 36px 32px;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-pill {' +
        'top: -22px; padding: 8px 16px; font-size: 22px;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-teams {' +
        'gap: 18px; margin-top: 22px; font-size: 24px;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-team-logo { width: 64px; height: 64px; }' +
      '.matches[data-layout="interstitial"] .dba-x { font-size: 28px; }' +
      '.matches[data-layout="interstitial"] .dba-odds {' +
        'gap: 32px; margin-top: 24px; font-size: 30px;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-odd { gap: 12px; }' +
      '.matches[data-layout="interstitial"] .dba-odd:before { width: 12px; height: 12px; }' +
      /* Interstitial + Brazil: spacing only (gap), keep default card metrics. */ +
      '.ad:has(.legal-band) .matches[data-layout="interstitial"] .dba-slide { gap: 40px; }';
    var s = el('style', { id: 'dba-runtime-styles' });
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function renderCard(m) {
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

    return el('div', { 'class': 'dba-card' }, [
      el('div', { 'class': 'dba-pill', text: pillText }),
      el('div', { 'class': 'dba-teams' }, [
        teamBlock(comps[0], 'home'),
        el('span', { 'class': 'dba-x', text: 'X' }),
        teamBlock(comps[1], 'away'),
      ]),
      el('div', { 'class': 'dba-odds' }, odds.filter(function (v) { return v != null; })
        .map(function (o) { return el('span', { 'class': 'dba-odd', text: fmtOdd(o) }); })),
    ]);
  }

  function buildSlides(games, perSlide) {
    var slides = [];
    for (var i = 0; i < games.length; i += perSlide) {
      var slide = el('div', { 'class': 'dba-slide' });
      var page = games.slice(i, i + perSlide);
      for (var j = 0; j < page.length; j++) slide.appendChild(renderCard(page[j]));
      slides.push(slide);
    }
    return slides;
  }

  // Mount slides into `node`. When there's more than one slide, run an
  // infinite-forward carousel: animate to a clone of slide 0 sitting at the
  // end of the track, then drop the transition and reset translateX(0). The
  // snap is invisible because both endpoints render the same content.
  function mountCarousel(node, slides, intervalMs, transitionMs) {
    while (node.firstChild) node.removeChild(node.firstChild);
    if (!slides.length) return;

    var track = el('div', { 'class': 'dba-track' });
    for (var i = 0; i < slides.length; i++) track.appendChild(slides[i]);
    node.appendChild(track);
    if (slides.length < 2) return;

    track.appendChild(slides[0].cloneNode(true));

    var n = slides.length;
    var pos = 0;
    function advance() {
      pos++;
      track.style.transition = 'transform ' + transitionMs + 'ms cubic-bezier(0.32, 0.72, 0.24, 1)';
      track.style.transform = 'translate3d(-' + (pos * 100) + '%, 0, 0)';
      if (pos === n) {
        setTimeout(function () {
          pos = 0;
          track.style.transition = 'none';
          track.style.transform = 'translate3d(0, 0, 0)';
          // Force a reflow so the next advance starts from a clean state.
          void track.offsetWidth;
        }, transitionMs + 30);
      }
    }
    setInterval(advance, intervalMs);
  }

  // Banner: pin each date pill's centre above the X between the crests
  // (section-centre is wrong when team names are asymmetric).
  function alignBannerPills(root) {
    var cards = root.querySelectorAll('.dba-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var pill = card.querySelector('.dba-pill');
      var x = card.querySelector('.dba-x');
      if (!pill || !x) continue;
      var cardRect = card.getBoundingClientRect();
      var xRect = x.getBoundingClientRect();
      var xC = xRect.left + xRect.width / 2 - cardRect.left;
      pill.style.left = xC + 'px';
    }
  }

  function render(node, data) {
    injectStyles();
    var perSlide = parseInt(node.getAttribute('data-per-slide') || node.getAttribute('data-max') || '2', 10);
    if (!isFinite(perSlide) || perSlide <= 0) perSlide = 2;
    var intervalMs = parseInt(node.getAttribute('data-interval') || '3500', 10);
    var transitionMs = parseInt(node.getAttribute('data-transition') || '700', 10);

    var games = extractMatches(data);
    if (!games.length) return;
    var slides = buildSlides(games, perSlide);
    mountCarousel(node, slides, intervalMs, transitionMs);
    if (node.getAttribute('data-layout') === 'banner') {
      alignBannerPills(node);
    }
  }
  window.DbaRenderMatches = render;

  function autoRender() {
    var nodes = document.querySelectorAll(ROOT_SEL);
    if (!nodes.length) return;
    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        var feed = node.getAttribute('data-feed');
        if (!feed) return;
        fetch(feed, { credentials: 'omit' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) { if (data) render(node, data); })
          .catch(function (err) {
            if (window.console) console.warn('[dba-runtime] feed failed:', err && err.message);
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
