/**
 * Format a time zone object for display everywhere in the project.
 * Template: "Time Zone Name (UTC #UTC_OFFSET value)"
 * e.g. "Israel Standard Time (UTC +2)", "Eastern (UTC -5)", "GMT Standard Time (UTC 0)"
 * @param {{ TIME_ZONE_NAME?: string, UTC_OFFSET?: number } | null | undefined} tz
 * @returns {string}
 */
export function formatTimeZoneDisplay(tz) {
  if (tz == null || (tz.TIME_ZONE_NAME == null && tz.UTC_OFFSET == null)) {
    return '';
  }
  const name = tz.TIME_ZONE_NAME ?? '';
  const offset = tz.UTC_OFFSET != null ? Number(tz.UTC_OFFSET) : 0;
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  return name ? `${name} (UTC ${offsetStr})` : `(UTC ${offsetStr})`;
}
