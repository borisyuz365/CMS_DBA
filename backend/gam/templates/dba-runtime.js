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
      '.matches .dba-slide { flex: 0 0 100%; width: 100%; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; }' +
      '.matches .dba-card { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 11px 12px 10px; position: relative; overflow: visible; }' +
      '.matches .dba-pill { position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.55); color: #fff; padding: 2px 6px; border-radius: 999px; font-size: 9px; font-weight: 600; line-height: 1; white-space: nowrap; }' +
      '.matches .dba-teams { display: flex; align-items: center; gap: 0; margin-top: 5px; font-size: 10px; font-weight: 600; min-width: 0; }' +
      '.matches .dba-teamblock { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }' +
      '.matches .dba-teamblock-home { justify-content: flex-end; }' +
      '.matches .dba-teamblock-away { justify-content: flex-start; }' +
      '.matches .dba-team-logo { width: 18px; height: 18px; flex: 0 0 auto; object-fit: contain; border-radius: 50%; background: rgba(255,255,255,0.08); }' +
      '.matches .dba-team-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '.matches .dba-x { font-size: 11px; font-weight: 700; opacity: 0.65; flex: 0 0 auto; margin: 0 12px; }' +
      '.matches .dba-odds { display: flex; align-items: center; margin-top: 5px; min-width: 0; min-height: 14px; font-size: 11px; font-weight: 700; line-height: 1.2; overflow: visible; }' +
      '.matches .dba-odd-slot { display: flex; align-items: center; min-width: 0; }' +
      '.matches .dba-odd-slot-home { flex: 1; justify-content: flex-end; padding-right: 24px; }' +
      '.matches .dba-odd-slot-draw { position: relative; flex: 0 0 auto; margin: 0 12px; font-size: 11px; font-weight: 700; line-height: 1.2; }' +
      '.matches .dba-odd-slot-draw:before { content: "X"; visibility: hidden; }' +
      '.matches .dba-odd-slot-draw .dba-odd { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }' +
      '.matches .dba-odd-slot-away { flex: 1; justify-content: flex-start; padding-left: 24px; }' +
      '.matches .dba-odd { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; line-height: 1.2; }' +
      '.matches .dba-odd-label { font-size: 7.5px; font-weight: 800; color: #FFC107; line-height: 1.2; }' +
      /* Brazil MPU: slightly denser cards so they clear the CTA (AdPreview). */ +
      '.ad-shell.legal-band .matches .dba-slide { gap: 12px; }' +
      '.ad-shell.legal-band .matches .dba-card { border-radius: 11px; padding: 10px 10px 9px; }' +
      '.ad-shell.legal-band .matches .dba-pill { top: -7px; padding: 2px 5px; font-size: 8px; }' +
      '.ad-shell.legal-band .matches { flex: 0 0 auto; margin-top: 0; margin-bottom: 4px; padding-top: 7px; overflow-x: hidden; overflow-y: visible; }' +
      '.ad-stack .matches { margin: 0; padding-top: 8px; overflow-x: hidden; overflow-y: visible; }' +
      '.ad-shell.legal-band .ad-stack .matches { padding-top: 7px; margin-bottom: 4px; }' +
      '.ad-shell.legal-band .matches .dba-teams { gap: 0; margin-top: 4px; font-size: 10px; }' +
      '.ad-shell.legal-band .matches .dba-teamblock { gap: 5px; }' +
      '.ad-shell.legal-band .matches .dba-team-logo { width: 15px; height: 15px; }' +
      '.ad-shell.legal-band .matches .dba-x { font-size: 10px; margin: 0 10px; }' +
      '.ad-shell.legal-band .matches .dba-odds { margin-top: 3px; font-size: 10px; }' +
      '.ad-shell.legal-band .matches .dba-odd-slot-home { padding-right: 20px; }' +
      '.ad-shell.legal-band .matches .dba-odd-slot-draw { margin: 0 10px; }' +
      '.ad-shell.legal-band .matches .dba-odd-slot-away { padding-left: 20px; }' +
      '.ad-shell.legal-band .matches .dba-odd-label { font-size: 7px; }' +
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
      '.matches[data-layout="banner"] .dba-teamblock { flex: 0 1 auto; gap: 4px; }' +
      '.matches[data-layout="banner"] .dba-team-logo { width: 11px; height: 11px; }' +
      '.matches[data-layout="banner"] .dba-x { font-size: 10px; opacity: 0.6; margin: 0 1px; }' +
      '.matches[data-layout="banner"] .dba-odds {' +
        'position: relative; height: 9px; display: block; margin-top: 0; font-size: 9px;' +
      '}' +
      '.matches[data-layout="banner"] .dba-odd-slot { display: contents; }' +
      '.matches[data-layout="banner"] .dba-odd-slot-draw:before { content: none; }' +
      '.matches[data-layout="banner"] .dba-odd {' +
        'position: absolute; top: 0; left: 0; transform: translateX(-50%); gap: 2px;' +
      '}' +
      '.matches[data-layout="banner"] .dba-odd-label { font-size: 6.5px; }' +
      /* Banner + Brazil legal band: denser metrics (BANNER.brazil.match). */ +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-card { gap: 1px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-pill { padding: 1px 3px; font-size: 6.6px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-teams { gap: 2px; font-size: 7.7px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-team-logo { width: 9px; height: 9px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-x { font-size: 7.7px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-odds { height: 8px; font-size: 7.7px; }' +
      '.ad-shell.legal-band .matches[data-layout="banner"] .dba-odd-label { font-size: 5.5px; }' +
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
        'gap: 0; margin-top: 22px; font-size: 24px; align-items: center;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-teamblock { gap: 18px; }' +
      /* Long team names wrap instead of ellipsizing (AdPreview wrapNames). */ +
      '.matches[data-layout="interstitial"] .dba-team-name {' +
        'white-space: normal; overflow: visible; text-overflow: unset;' +
        'overflow-wrap: break-word; word-break: break-word; line-height: 1.15;' +
      '}' +
      '.matches[data-layout="interstitial"] .dba-team-logo { width: 64px; height: 64px; }' +
      '.matches[data-layout="interstitial"] .dba-x { font-size: 28px; margin: 0 36px; }' +
      '.matches[data-layout="interstitial"] .dba-odds { margin-top: 24px; font-size: 30px; }' +
      '.matches[data-layout="interstitial"] .dba-odd-slot-home { padding-right: 82px; }' +
      '.matches[data-layout="interstitial"] .dba-odd-slot-draw { margin: 0 36px; }' +
      '.matches[data-layout="interstitial"] .dba-odd-slot-away { padding-left: 82px; }' +
      '.matches[data-layout="interstitial"] .dba-odd { gap: 8px; }' +
      '.matches[data-layout="interstitial"] .dba-odd-label { font-size: 20px; }' +
      /* Interstitial + Brazil: spacing only (gap), keep default card metrics. */ +
      '.ad-shell.legal-band .matches[data-layout="interstitial"] .dba-slide { gap: 40px; }' +
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
      '.ad-shell.legal-band .ad .cta { position: absolute; left: 12px; right: 12px; bottom: 43px; margin-top: 0; z-index: 2; }' +
      '.ad .dba-dots[data-layout="interstitial"] { height: 24px; margin-top: 24px; gap: 12px; }' +
      '.ad .dba-dots[data-layout="interstitial"] .dba-dot { height: 10px; width: 10px; }' +
      '.ad .dba-dots[data-layout="interstitial"] .dba-dot-active { width: 24px; }' +
      '.ad-shell.legal-band .ad .dba-dots[data-layout="interstitial"] { margin-top: 0; }';
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
      el('div', { 'class': 'dba-pill', text: pillText }),
      el('div', { 'class': 'dba-teams' }, [
        teamBlock(comps[0], 'home'),
        el('span', { 'class': 'dba-x', text: 'X' }),
        teamBlock(comps[1], 'away'),
      ]),
      el('div', { 'class': 'dba-odds' }, oddNodes),
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

    // Mount on the shell (sibling of the click <a>) so GAM / SafeFrame does not
    // drop dots injected inside the anchor layer.
    if (shell) {
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
    } else {
      var cta = ad.querySelector('.cta');
      if (cta) ad.insertBefore(dots, cta.nextSibling);
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

    if (n < 2) return;

    track.appendChild(slides[0].cloneNode(true));

    var pos = 0;
    function setActive(idx) {
      updateDots(dotsEl, ((idx % n) + n) % n);
    }
    function advance() {
      pos++;
      setActive(pos);
      track.style.transition = 'transform ' + transitionMs + 'ms cubic-bezier(0.32, 0.72, 0.24, 1)';
      track.style.transform = 'translate3d(-' + (pos * 100) + '%, 0, 0)';
      if (pos === n) {
        setTimeout(function () {
          pos = 0;
          setActive(0);
          track.style.transition = 'none';
          track.style.transform = 'translate3d(0, 0, 0)';
          void track.offsetWidth;
        }, transitionMs + 30);
      }
    }
    setActive(0);
    setInterval(advance, intervalMs);
  }

  // Banner only: pin odds under team names (MPU/interstitial use CSS flex slots).
  var ODDS_X_TIGHTEN = 0.828;
  var ODDS_GAP_TIGHTEN = 0.75;

  function alignBannerOdds(card) {
    var homeName = card.querySelector('.dba-teamblock-home .dba-team-name');
    var awayName = card.querySelector('.dba-teamblock-away .dba-team-name');
    var x = card.querySelector('.dba-x');
    var oddsRow = card.querySelector('.dba-odds');
    var pill = card.querySelector('.dba-pill');
    if (!homeName || !awayName || !x || !oddsRow) return;
    var odds = oddsRow.querySelectorAll('.dba-odd');
    if (odds.length < 3) return;
    var oddsRect = oddsRow.getBoundingClientRect();
    var homeRect = homeName.getBoundingClientRect();
    var awayRect = awayName.getBoundingClientRect();
    var xRect = x.getBoundingClientRect();
    var homeC = homeRect.left + homeRect.width / 2 - oddsRect.left;
    var awayC = awayRect.left + awayRect.width / 2 - oddsRect.left;
    var xC = xRect.left + xRect.width / 2 - oddsRect.left;
    var dist = Math.min(Math.abs(xC - homeC), Math.abs(awayC - xC)) * ODDS_X_TIGHTEN * ODDS_GAP_TIGHTEN;
    if (pill) {
      var cardRect = card.getBoundingClientRect();
      pill.style.left = (xRect.left + xRect.width / 2 - cardRect.left) + 'px';
    }
    odds[0].style.left = (xC - dist) + 'px';
    odds[1].style.left = xC + 'px';
    odds[2].style.left = (xC + dist) + 'px';
  }

  function alignMatchLayout(root) {
    if (root.getAttribute('data-layout') !== 'banner') return;
    var cards = root.querySelectorAll('.dba-card');
    for (var i = 0; i < cards.length; i++) alignBannerOdds(cards[i]);
  }

  function scheduleAlign(root) {
    alignMatchLayout(root);
    requestAnimationFrame(function () {
      alignMatchLayout(root);
      requestAnimationFrame(function () { alignMatchLayout(root); });
    });
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
    scheduleAlign(node);
  }
  window.DbaRenderMatches = render;

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
            if (data && extractMatches(data).length) render(node, data);
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
