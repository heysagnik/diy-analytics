let displayNames: Intl.DisplayNames | null | undefined;

function getDisplayNames(): Intl.DisplayNames | null {
  if (displayNames !== undefined) return displayNames;
  try {
    displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    displayNames = null;
  }
  return displayNames;
}

/** Converts an ISO 3166-1 alpha-2 country code (e.g. "IN", "US") to its full name. Falls back to the raw input for codes that don't resolve (e.g. "Unknown", "XX"). */
export function getCountryName(code: string): string {
  if (!code) return code;
  const region = getDisplayNames();
  if (!region || code.length !== 2) return code;
  try {
    const name = region.of(code.toUpperCase());
    return name && name !== code.toUpperCase() ? name : code;
  } catch {
    return code;
  }
}
