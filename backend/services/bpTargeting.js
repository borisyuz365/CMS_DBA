// Targeting filter + SOV-weighted version selection for BPMB.
//
// Given a list of promotion versions (from bpCache) and a set of client
// params, returns a single selected version or null if nothing matches.
//
// Matching rules:
//   cid      — exact match OR version.cid === null (all countries)
//   platform — exact match OR version.platform === 'All'
//   lid      — exact match OR version.lid === null (all leagues)
//
// SOV selection: weighted random lottery among the matching candidates.
// Versions with higher SOV are proportionally more likely to be served.

function selectVersion(versions, { cid, platform, lid } = {}) {
  const candidates = versions.filter((v) => {
    const cidMatch      = cid == null || v.cid == null      || v.cid      === Number(cid);
    const platformMatch = !platform || v.platform === 'All' || v.platform === platform;
    const lidMatch      = lid == null || v.lid == null       || v.lid      === Number(lid);
    return cidMatch && platformMatch && lidMatch;
  });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Weighted random pick by SOV.
  const totalSov = candidates.reduce((sum, v) => sum + (v.sov || 0), 0);
  if (totalSov === 0) return candidates[Math.floor(Math.random() * candidates.length)];

  let rand = Math.random() * totalSov;
  for (const v of candidates) {
    rand -= v.sov || 0;
    if (rand <= 0) return v;
  }
  return candidates[candidates.length - 1];
}

module.exports = { selectVersion };
