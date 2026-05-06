"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/intern/claim", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      router.push(`/intern/record/${encodeURIComponent(data.recordId)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Claim failed");
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={claim}
        disabled={busy}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {busy ? "Assigning…" : "Assign me a new record"}
      </button>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
