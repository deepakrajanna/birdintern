import type { BirdRecord } from "@/lib/types";
import { formatLatLong, parseCoordinate } from "@/lib/coords";

// Field definitions used by the two tables.
//   - `keys` is the list of header names to try in order (handles minor
//     header variations across sheets).
//   - `combine: true` pulls every non-empty value from `keys` into one row,
//     stacked vertically (used for "Remarks").
//   - `hideIfEmpty: true` drops the row when no value is found.
//   - `emptyFallback` is the text shown when no value is found (default "—").
//     Ignored if hideIfEmpty is set.
interface FieldDef {
  label: string;
  keys: string[];
  combine?: boolean;
  hideIfEmpty?: boolean;
  emptyFallback?: string;
}

const PLACEHOLDER = "—";

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
  // Renamed from "Resighting Scientific Name"; lookup key unchanged.
  { label: "Scientific name", keys: ["Resighting Scientific Name"] },
  { label: "Sex", keys: ["Sex"] },
  { label: "Date Of Ringing", keys: ["Date Of Ringing"] },
  { label: "Place Of Ringing", keys: ["Place Of Ringing"] },
  { label: "Ringer", keys: ["Ringer"] },
  { label: "Latitude", keys: ["Latitude", "Lattitude"] },
  { label: "Longitude", keys: ["Longitude"] },
  { label: "Place Of Recovery", keys: ["Place Of Recovery"] },
  // Synthetic — computed from Latitude + Longitude.
  { label: "Coordinates (decimal)", keys: [] },
  { label: "Date Of Recovery", keys: ["Date Of Recovery"] },
  {
    label: "Reported By",
    keys: ["Reported By"],
    emptyFallback: "Unspecified",
  },
  // Synthetic — formatted block: "Reported by: …" + "Source: …".
  { label: "Remarks", keys: [] },
];

const COORDS_LABEL = "Coordinates (decimal)";
const REMARKS_LABEL = "Remarks";

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function lookupFirstValue(record: BirdRecord, keys: string[]): string {
  for (const k of keys) {
    const v = record.fields[k];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function lookupAllValues(record: BirdRecord, keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const v = record.fields[k];
    if (v !== undefined && v !== "") out.push(v);
  }
  return out;
}

function shouldHighlight(
  label: string,
  value: string,
  record: BirdRecord
): boolean {
  if (label === "Scientific name") {
    const a = value.trim().toLowerCase();
    const b = (record.fields["Ringing Species"] || "").trim().toLowerCase();
    return !!a && !!b && a !== b;
  }
  return false;
}

/**
 * Render a single value: clickable link if it's a URL, plain text otherwise.
 */
function renderSingleValue(value: string) {
  if (isUrl(value)) {
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
  return (
    <span className="select-all whitespace-pre-wrap">{value}</span>
  );
}

interface ResolvedRow {
  label: string;
  values: string[]; // 1+ values; multiple are rendered stacked
  isCoords: boolean;
  highlight: boolean;
  /** When set, replaces the default cell rendering. */
  customCell?: React.ReactNode;
}

/** Builds the "Remarks" cell: Reported by + Source, stacked. */
function buildRemarksCell(record: BirdRecord): React.ReactNode {
  const reportedByRaw = lookupFirstValue(record, ["Reported By"]);
  const sourceRaw = lookupFirstValue(record, ["Resighting Page Link"]);
  const reportedBy = reportedByRaw || "Unspecified";

  return (
    <div className="space-y-1">
      <div>
        <span className="font-medium text-slate-700">Reported by: </span>
        <span className="select-all">{reportedBy}</span>
      </div>
      <div>
        <span className="font-medium text-slate-700">Source: </span>
        {sourceRaw ? (
          renderSingleValue(sourceRaw)
        ) : (
          <span className="text-slate-400">{PLACEHOLDER}</span>
        )}
      </div>
    </div>
  );
}

function resolveRows(
  defs: FieldDef[],
  record: BirdRecord,
  combined: string | null
): ResolvedRow[] {
  return defs.flatMap<ResolvedRow>((f) => {
    if (f.label === COORDS_LABEL) {
      // Synthetic field — drop silently when we can't compute it.
      if (!combined) return [];
      return [
        {
          label: COORDS_LABEL,
          values: [combined],
          isCoords: true,
          highlight: false,
        },
      ];
    }
    if (f.label === REMARKS_LABEL) {
      return [
        {
          label: REMARKS_LABEL,
          values: [],
          isCoords: false,
          highlight: false,
          customCell: buildRemarksCell(record),
        },
      ];
    }
    if (f.combine) {
      const values = lookupAllValues(record, f.keys);
      if (values.length === 0) {
        if (f.hideIfEmpty) return [];
        return [
          {
            label: f.label,
            values: [f.emptyFallback ?? PLACEHOLDER],
            isCoords: false,
            highlight: false,
          },
        ];
      }
      return [{ label: f.label, values, isCoords: false, highlight: false }];
    }
    const v = lookupFirstValue(record, f.keys);
    if (!v) {
      if (f.hideIfEmpty) return [];
      return [
        {
          label: f.label,
          values: [f.emptyFallback ?? PLACEHOLDER],
          isCoords: false,
          highlight: false,
        },
      ];
    }
    return [
      {
        label: f.label,
        values: [v],
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
                      ? "w-1/3 bg-emerald-100 px-4 py-2 align-top font-medium text-emerald-900"
                      : "w-1/3 bg-slate-50 px-4 py-2 align-top font-medium text-slate-700"
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
                  {r.customCell ??
                    r.values.map((v, i) => (
                      <div key={i} className={i > 0 ? "mt-2" : ""}>
                        {renderSingleValue(v)}
                      </div>
                    ))}
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
  // Unauthenticated Google Maps embed — no API key required.
  // q=lat,lng drops a marker; z controls zoom; hl=en forces English labels.
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
