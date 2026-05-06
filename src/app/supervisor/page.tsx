import { listSupervisorQueue } from "@/lib/records";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SupervisorQueue() {
  const queue = await listSupervisorQueue();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Submitted records</h1>
      <p className="text-sm text-slate-600">
        Records marked <em>Copied to Avifauna</em> or <em>Duplicate</em> by
        interns. Blocked records are routed to the admin instead.
      </p>

      {queue.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          The queue is empty. Nothing to review right now.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Species</th>
                <th className="px-4 py-2">Intern</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((r) => (
                <tr key={r.ID} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono">{r.ID}</td>
                  <td className="px-4 py-2">
                    {r.fields["Scientific Name"] || "—"}
                  </td>
                  <td className="px-4 py-2">{r.assigned_to_name}</td>
                  <td className="px-4 py-2">{r.intern_status}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {r.intern_submitted_at?.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/supervisor/record/${encodeURIComponent(r.ID)}`}
                      className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
