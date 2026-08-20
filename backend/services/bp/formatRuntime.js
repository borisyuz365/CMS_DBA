// Flat runtime JSON for GET /api/bp (mobile clients).
// Shared by bp-service; CMS Swagger references the same shape.

const ITALY_CID = 3;
const PLATFORM_BY_APP_TYPE = { '1': 'iOS', '2': 'Android' };

function parseOptionalInt(val) {
  if (val == null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function absolutizeAssetUrl(pathOrUrl) {
  if (!pathOrUrl || /^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (process.env.BP_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return base ? `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}` : pathOrUrl;
}

function formatVersion(v, { uc } = {}) {
  const requestUc = parseOptionalInt(uc);
  return {
    BP_Version_Name:    v.name,
    Num_Of_Bookies:     v.bookies.length,
    Targeting: {
      uc: requestUc,
      LID: v.lid,
      SOV: v.sov,
      Lang: v.lang,
      Publisher: v.publisher,
      Campaign: v.campaign,
    },
    Header: {
      Main_Title:      { Text: v.header.mainTitle.text,      Color: v.header.mainTitle.color },
      Secondary_Title: { Text: v.header.secondaryTitle.text, Color: v.header.secondaryTitle.color },
      ImageURL:        absolutizeAssetUrl(v.header.imageUrl),
    },
    Page_Background_Color: v.pageBgColor,
    Page_Background: {
      Type:           v.bgType || 'solid',
      Color:          v.pageBgColor,
      GradientColor1: v.bgGradientColor1,
      GradientColor2: v.bgGradientColor2,
      GradientAngle:  v.bgGradientAngle,
      ImageUrl:       absolutizeAssetUrl(v.bgImageUrl),
    },
    Legal: v.legal?.enabled ? {
      Text:  v.legal.text,
      Color: v.legal.color,
      Link:  v.legal.link,
      Regulatory_Logos: requestUc === ITALY_CID
        ? v.legal.regulatoryLogos.map((l) => ({
            Src: absolutizeAssetUrl(l.src),
            Link: l.link,
          }))
        : undefined,
    } : null,
    Bookies: v.bookies.map((b) => ({
      BMID:             b.bmid,
      Section_BG_Color: b.sectionBgColor,
      Title_Text:       b.titleText,
      Title_Text_Color: b.titleTextColor,
      Subtitle_Text:       b.subtitleText,
      Subtitle_Text_Color: b.subtitleTextColor || null,
      CTA_Text:         b.ctaText,
      CTA_Text_Color:   b.ctaTextColor,
      Strip_Colors:     b.stripColors,
      Click_URL:        b.clickUrl,
      Logo_Image_URL:   absolutizeAssetUrl(b.logoImageUrl),
    })),
  };
}

module.exports = {
  ITALY_CID,
  PLATFORM_BY_APP_TYPE,
  parseOptionalInt,
  absolutizeAssetUrl,
  formatVersion,
};
