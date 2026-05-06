import type { BirdRecord } from "@/lib/types";

const HIDDEN_FIELDS = new Set([
  // Workflow internals — these are surfaced separately by the page that
  // wraps RecordView.
  "assigned_to_email",
  "assigned_to_name",
  "assigned_at",
  "intern_status",
  "intern_remarks",
  "intern_submitted_at",
  "supervisor_email",
  "supervisor_status",
  "supervisor_remarks",
  "supervisor_reviewed_at",
  "last_revert_reason",
  "last_revert_by",
  "admin_resolution_note",
  "state",
]);

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Treat any field whose name contains the word "Link" as a hyperlink field. */
function isLinkField(name: string): boolean {
  return /\blink\b/i.test(name);
}

/**
 * Returns true if this row's value should be highlighted in red because it
 * disagrees with another related field. Currently: Resighting Scientific
 * Name vs. Ringing Species. Only triggers when both values are present.
 */
function shouldHighlight(
  fieldName: string,
  value: string,
  fields: Record<string, string>
): boolean {
  if (fieldName === "Resighting Scientific Name") {
    const a = value.trim().toLowerCase();
    const b = (fields["Ringing Species"] || "").trim().toLowerCase();
    return !!a && !!b && a !== b;
  }
  return false;
}

function renderValue(name: string, value: string) {
  if (isLinkField(name) && isUrl(value)) {
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

export default function RecordView({ record }: { record: BirdRecord }) {
  const entries = Object.entries(record.fields).filter(
    ([k, v]) => !HIDDEN_FIELDS.has(k) && v !== ""
  );
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([k, v]) => {
            const highlight = shouldHighlight(k, v, record.fields);
            return (
              <tr key={k} className="border-b border-slate-100 last:border-0">
                <td className="w-1/3 bg-slate-50 px-4 py-2 font-medium text-slate-700">
                  {k}
                </td>
                <td
                  className={
                    highlight
                      ? "px-4 py-2 font-medium text-red-600"
                      : "px-4 py-2 text-slate-900"
                  }
                >
                  {renderValue(k, v)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
