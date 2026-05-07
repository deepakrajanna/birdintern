import type { BirdRecord } from "@/lib/types";
import { formatLatLong, parseCoordinate } from "@/lib/coords";

// Field definitions used by the two tables. Each entry has a `keys` list
// of header names to try in order — useful when the sheet might use a
// renamed column (e.g. "Latitude" vs the CSV's typo'd "Lattitude").
interface FieldDef {
  label: string;
  keys: string[];
}

const RINGING_FIELDS: FieldDef[] = [
  { label: "Ring number", keys: ["Ring number", "Ring_concat"] },
  {
    label: "Bird - Ring_concat → Ringer",
    keys: ["Bird - Ring_concat → Ringer"],
  },
  { label: "Ringing Species", keys: ["Ringing Species"] },
  { label: "Bird - Ringing Date", keys: ["Bird - Ringing Date"] },
  { label: "Year of ringing", keys: ["Year of ringing", "year_ringing"] },
  { label: "Ringing Page Link", keys: ["Ringing Page Link"] },
];

const RESIGHTING_FIELDS: FieldDef[] = [
  { label: "ID", keys: ["ID"] },
  { label: "Ring number", keys: ["Ring number", "Ring_concat"] },
  {
    label: "Resighting Scientific Name",
    keys: ["Resighting Scientific Name"],
  },
  { label: "Sex", keys: ["Sex"] },
  { label: "Latitude", keys: ["Latitude", "Lattitude"] },
  { label: "Longitude", keys: ["Longitude"] },
  { label: "Date Of Ringing", keys: ["Date Of Ringing"] },
  { label: "Date Of Recovery", keys: ["Date Of Recovery"] },
  { label: "Place Of Ringing", keys: ["Place Of Ringing"] },
  { label: "Place Of Recovery", keys: ["Place Of Recovery"] },
  // Synthetic — computed from Latitude + Longitude. Position in the array
  // is the position in the rendered table.
  { label: "Coordinates (decimal)", keys: [] },
  { label: "Ringer", keys: ["Ringer"] },
  { label: "Resighting Page Link", keys: ["Resighting Page Link"] },
];

const COORDS_LABEL = "Coordinates (decimal)";

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function isLinkField(name: string): boolean {
  return /\blink\b/i.test(name);
}

function lookupValue(record: BirdRecord, keys: string[]): string {
  for (const k of keys) {
    const v = record.fields[k];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function shouldHighlight(
  label: string,
  value: string,
  record: BirdRecord
): boolean {
  if (label === "Resighting Scientific Name") {
    const a = value.trim().toLowerCase();
    const b = (record.fields["Ringing Species"] || "").trim().toLowerCase();
    return !!a && !!b && a !== b;
  }
  return false;
}

function renderValue(label: string, value: string) {
  if (isLinkField(label) && isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-sky-600 underline hover:text-sky-700"
      >
        {value}
      </a>
    );
  }
  return <span className="select-all">{value}</span>;
}

interface ResolvedRow {
  label: string;
  value: string;
  isCoords: boolean;
  highlight: boolean;
}

function resolveRows(
  defs: FieldDef[],
  record: BirdRecord,
  combined: string | null
): ResolvedRow[] {
  return defs.flatMap((f) => {
    if (f.label === COORDS_LABEL) {
      if (!combined) return [];
      return [
        { label: COORDS_LABEL, value: combined, isCoords: true, highlight: false },
      ];
    }
    const v = lookupValue(record, f.keys);
    if (!v) return [];
    return [
      {
        label: f.label,
        value: v,
        isCoords: false,
        highlight: shouldHighlight(f.label, v, record),
      },
    ];
  });
}

function FieldTable({ title, rows }: { title: string; rows: ResolvedRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.label}
                className={
                  r.isCoords
                    ? "border-b border-slate-100 bg-emerald-50 last:border-0"
                    : "border-b border-slate-100 last:border-0"
                }
              >
                <td
                  className={
                    r.isCoords
                      ? "w-1/3 bg-emerald-100 px-4 py-2 font-medium text-emerald-900"
                      : "w-1/3 bg-slate-50 px-4 py-2 font-medium text-slate-700"
                  }
                >
                  {r.label}
                </td>
                <td
                  className={
                    r.isCoords
                      ? "px-4 py-2 font-mono text-emerald-900"
                      : r.highlight
                        ? "px-4 py-2 font-medium text-red-600"
                        : "px-4 py-2 text-slate-900"
                  }
                >
                  {renderValue(r.label, r.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  // Using the unauthenticated Google Maps embed URL — no API key required.
  // q=lat,lng drops a marker; z controls zoom (lower = wider view).
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${lat},${lng}`
  )}&z=8&hl=en&output=embed`;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <iframe
        title="Location"
        src={src}
        width="100%"
        height="320"
        loading="lazy"
        style={{ border: 0 }}
        allowFullScreen
      />
    </div>
  );
}

export default function RecordView({
  record,
  hideFields = [],
}: {
  record: BirdRecord;
  /** Field labels (as shown to the user) to suppress in either table. */
  hideFields?: string[];
}) {
  const hidden = new Set(hideFields);
  const filterDefs = (defs: FieldDef[]) =>
    defs.filter((f) => !hidden.has(f.label));

  // Parse coordinates once and share with both the table (for the synthetic
  // row) and the map embed.
  const latRaw =
    record.fields["Lattitude"] ||
    record.fields["Latitude"] ||
    record.fields["latitude"] ||
    "";
  const lngRaw =
    record.fields["Longitude"] || record.fields["longitude"] || "";
  const latNum = parseCoordinate(latRaw);
  const lngNum = parseCoordinate(lngRaw);
  const combined = formatLatLong(latRaw, lngRaw);

  const ringingRows = resolveRows(filterDefs(RINGING_FIELDS), record, combined);
  const resightingRows = resolveRows(
    filterDefs(RESIGHTING_FIELDS),
    record,
    combined
  );

  return (
    <div className="space-y-6">
      <FieldTable title="Ringing details" rows={ringingRows} />
      {latNum !== null && lngNum !== null && (
        <MapEmbed lat={latNum} lng={lngNum} />
      )}
      <FieldTable title="Resighting details" rows={resightingRows} />
    </div>
  );
}
