/**
 * Parse a single latitude or longitude string into decimal degrees.
 *
 * The data in the source sheet mixes formats wildly. This handles:
 *   - Decimal:               "45.40"  "27.49°N"  "42.31 N"  "-22.5"
 *   - Degrees + minutes:     "42°52'N"  "60 12'N"  "42 52 N"
 *   - Degrees + minutes + s: "42°52'30\"N"  "42 52 30 N"
 *   - Quirks seen in the wild: "50.54.N" (period before cardinal), spaces
 *     between degree symbol and number, mixed Unicode prime characters.
 *
 * Returns null if no numeric content could be extracted.
 */
export function parseCoordinate(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // Cardinal direction at the end determines sign. S/W are negative.
  let sign = 1;
  const cardinalMatch = s.match(/([NSEWnsew])\s*$/);
  let core = s;
  if (cardinalMatch) {
    const c = cardinalMatch[1].toUpperCase();
    if (c === "S" || c === "W") sign = -1;
    core = s.replace(/[NSEWnsew]\s*$/, "").trim();
  }

  // Replace any degree/minute/second symbol or stray punctuation with a space.
  // ° ' " ′ ″ commas semicolons all become separators between numbers.
  const cleaned = core.replace(/[°'′"″,;]/g, " ").trim();

  // Pull out numeric tokens. Allows optional minus, optional decimals.
  const matches = cleaned.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const tokens = matches.map(parseFloat);

  let value: number;
  if (tokens.length === 1) {
    value = tokens[0]; // decimal degrees
  } else if (tokens.length === 2) {
    value = tokens[0] + tokens[1] / 60; // degrees + minutes
  } else if (tokens.length === 3) {
    value = tokens[0] + tokens[1] / 60 + tokens[2] / 3600; // DMS
  } else {
    return null;
  }

  return sign * value;
}

/**
 * Combine lat + long strings into a single comma-separated decimal value
 * suitable for pasting into Google Maps or Avifauna. Returns null if either
 * side can't be parsed.
 */
export function formatLatLong(lat: string, lng: string): string | null {
  const a = parseCoordinate(lat);
  const b = parseCoordinate(lng);
  if (a === null || b === null) return null;
  // 6 decimal places ≈ 11cm precision; plenty for ringing data.
  return `${a.toFixed(6)}, ${b.toFixed(6)}`;
}
