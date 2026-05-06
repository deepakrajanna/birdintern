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

export default function RecordView({ record }: { record: BirdRecord }) {
  const entries = Object.entries(record.fields).filter(
    ([k, v]) => !HIDDEN_FIELDS.has(k) && v !== ""
  );
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="border-b border-slate-100 last:border-0">
              <td className="w-1/3 bg-slate-50 px-4 py-2 font-medium text-slate-700">
                {k}
              </td>
              <td className="px-4 py-2 text-slate-900">
                <span className="select-all">{v}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
