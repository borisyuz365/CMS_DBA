import React from 'react';
import { bookmakerLogoUrl } from './dbaUtils';

/** Pixel-match the GAM `3bm-mpu.html` stylesheet — no MUI Typography. */
const THREE_BM_PREVIEW_CSS = `
.dba-3bm-preview-root { width: 100%; }
.dba-3bm-preview-root .mpu-rigid-split {
  width: 100%; height: 250px; box-sizing: border-box; display: flex; flex-direction: column;
  overflow: hidden; border: 1px solid #000; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  border-radius: 8px; background: #111;
}
.dba-3bm-preview-root .mpu-section {
  height: 83.33px; max-height: 83.33px; display: flex; flex-direction: column; justify-content: space-between;
  padding: 6px 12px 8px 12px; text-decoration: none; box-sizing: border-box; overflow: hidden; cursor: default;
}
.dba-3bm-preview-root .mpu-section:not(:last-child) { border-bottom: 1px solid rgba(255,255,255,0.1); }
.dba-3bm-preview-root .card-top-line {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 100%; max-height: 24px; overflow: hidden; flex-shrink: 0;
}
.dba-3bm-preview-root .param-logo-img {
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: auto; max-width: 75px; object-fit: contain; flex-shrink: 0; display: block;
}
.dba-3bm-preview-root .param-headline {
  width: 100%; text-align: center; padding: 0 75px; margin: 0;
  white-space: normal; word-break: break-word; overflow: hidden; line-height: 1.1;
  font-family: inherit;
}
.dba-3bm-preview-root .param-conditions {
  width: 100%; line-height: 1.1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; text-align: center; margin: 1px 0 2px; flex-shrink: 0; font-family: inherit;
}
.dba-3bm-preview-root .param-cta-btn {
  width: 100%; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  text-align: center; text-transform: uppercase; box-sizing: border-box; flex-shrink: 0; font-family: inherit;
  letter-spacing: 0.02em;
}
`;

/**
 * Live 3-bookie MPU preview matching the GAM export layout.
 * @param {object[]} sections — config.sections from a 3bm template
 * @param {object[]} [bookmakers] — optional pool/DBA rows for logo fallback
 * @param {number} [scale=1] — CSS scale for list thumbnails (native size is 300×250)
 * @param {number} [width=300] — layout width before scaling
 */
export default function ThreeBmPreview({
  sections = [],
  bookmakers = [],
  scale = 1,
  width = 300,
}) {
  const rows = Array.from({ length: 3 }, (_, i) => sections[i] || {});
  const nativeW = width;
  const nativeH = 250;

  return (
    <div
      style={{
        width: nativeW * scale,
        height: nativeH * scale,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        className="dba-3bm-preview-root"
        style={{
          width: nativeW,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        <style>{THREE_BM_PREVIEW_CSS}</style>
        <div className="mpu-rigid-split" style={{ width: nativeW }}>
          {rows.map((sec, i) => {
            const bm = bookmakers.find((b) => String(b.id) === String(sec.bookmakerId));
            const logo = sec.logoUrl
              || (bm ? (bm.defaultLogoImageUrl || bm.defaultLogo?.imageUrl || bookmakerLogoUrl(bm.id, { noBg: !!bm.useNoBgLogo })) : '')
              || (sec.bookmakerId ? bookmakerLogoUrl(sec.bookmakerId) : '');
            const headline = (sec.headline || '').trim() || sec.bookmakerName || 'Headline';
            const conditions = (sec.conditions || '').trim() || 'Conditions';
            const cta = (sec.ctaText || '').trim() || 'Bet Now';
            return (
              <div
                key={i}
                className="mpu-section"
                style={{ backgroundColor: sec.bg || bm?.brandColor || bm?.logoBg || '#151E22' }}
              >
                <div className="card-top-line">
                  {logo ? (
                    <img
                      className="param-logo-img"
                      src={logo}
                      alt={sec.bookmakerName || bm?.name || ''}
                      style={{ height: `${Number(sec.logoHeight) || 20}px` }}
                    />
                  ) : null}
                  <div
                    className="param-headline"
                    style={{
                      color: sec.headlineColor || '#FFFFFF',
                      fontSize: `${Number(sec.headlineSize) || 12}px`,
                      fontWeight: Number(sec.headlineWeight) || 700,
                    }}
                  >
                    {headline}
                  </div>
                </div>
                <div
                  className="param-conditions"
                  style={{
                    color: sec.conditionsColor || sec.headlineColor || '#FFFFFF',
                    fontSize: `${Number(sec.conditionsSize) || 8}px`,
                    fontWeight: Number(sec.conditionsWeight) || 400,
                  }}
                >
                  {conditions}
                </div>
                <div
                  className="param-cta-btn"
                  style={{
                    color: sec.ctaColor || '#0A0A0A',
                    backgroundColor: sec.ctaBg || '#FFFFFF',
                    fontSize: `${Number(sec.ctaSize) || 11}px`,
                    fontWeight: Number(sec.ctaWeight) || 700,
                  }}
                >
                  {cta}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
