"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BirdRecord } from "@/lib/types";

// Workflow columns the admin shouldn't be editing here.
const WORKFLOW = new Set([
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
  "ID",
]);

export default function ResolveForm({ record }: { record: BirdRecord }) {
  const router = useRouter();
  const editableKeys = useMemo(
    () => Object.keys(record.fields).filter((k) => !WORKFLOW.has(k)),
    [record.fields]
  );
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField(name: string, value: string) {
    setEdits((prev) => ({ ...prev, [name]: value }));
  }

  async function submit() {
    if (!note.trim()) {
      setErr("A resolution note is required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      // Only send fields that actually changed.
      const fieldEdits: Record<string, string> = {};
      for (const [k, v] of Object.entries(edits)) {
        if (v !== record.fields[k]) fieldEdits[k] = v;
      }
      const res = await fetch("/api/admin/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recordId: record.ID,
          resolutionNote: note,
          fieldEdits,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resolve failed");
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Resolve failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Edit fields (optional)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Only fields you change will be written back.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {editableKeys.map((k) => (
            <label key={k} className="text-sm">
              <span className="block text-slate-700">{k}</span>
              <input
                type="text"
                defaultValue={record.fields[k] || ""}
                onChange={(e) => setField(k, e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Resolution note</h2>
        <p className="mt-1 text-sm text-slate-600">
          Required. This is shown to the next intern who picks up this record.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g. Coordinates were ambiguous; corrected to decimal degrees. Proceed."
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Send back to queue"}
          </button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>
    </div>
  );
}
