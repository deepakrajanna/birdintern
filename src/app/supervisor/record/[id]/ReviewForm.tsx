"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewForm({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"Checked" | "Reverted" | "">("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const remarksRequired = decision === "Reverted";
  const canSubmit =
    !!decision && (!remarksRequired || remarks.trim().length > 0);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/supervisor/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordId, decision, remarks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review failed");
      router.push("/supervisor");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Review failed");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Decision</h2>
      <div className="mt-3 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="decision"
            checked={decision === "Checked"}
            onChange={() => setDecision("Checked")}
          />
          Checked — work looks good, approve
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="decision"
            checked={decision === "Reverted"}
            onChange={() => setDecision("Reverted")}
          />
          Revert — needs to be redone (returns to pool)
        </label>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">
          Remarks{remarksRequired && <span className="text-red-600"> *</span>}
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={
            remarksRequired
              ? "Required: explain why this needs to be redone"
              : "Optional"
          }
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit || busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save decision"}
        </button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}
