import {
  computeInternProgress,
  computeOverallStats,
  listAdminBlockedQueue,
} from "@/lib/records";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [overall, interns, blocked] = await Promise.all([
    computeOverallStats(),
    computeInternProgress(),
    listAdminBlockedQueue(),
  ]);

  const pct = (n: number) =>
    overall.total === 0 ? "—" : `${Math.round((n / overall.total) * 100)}%`;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {/* Overall stats */}
      <section>
        <h2 className="text-lg font-semibold">Pipeline</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">State</th>
                <th className="px-4 py-2 text-right">Count</th>
                <th className="px-4 py-2 text-right">% of total</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Unassigned" value={overall.unassigned} pct={pct(overall.unassigned)} />
              <Row label="In progress (claimed)" value={overall.in_progress} pct={pct(overall.in_progress)} />
              <Row label="Awaiting supervisor" value={overall.awaiting_supervisor} pct={pct(overall.awaiting_supervisor)} />
              <Row label="Blocked (admin queue)" value={overall.blocked} pct={pct(overall.blocked)} />
              <Row label="Approved" value={overall.approved} pct={pct(overall.approved)} />
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right">{overall.total}</td>
                <td className="px-4 py-2 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-intern progress */}
      <section>
        <h2 className="text-lg font-semibold">Intern progress</h2>
        {interns.length === 0 ? (
          <div className="mt-3 rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No active interns in the users tab.
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Intern</th>
                  <th className="px-4 py-2 text-right">In&nbsp;progress</th>
                  <th className="px-4 py-2 text-right">Awaiting&nbsp;review</th>
                  <th className="px-4 py-2 text-right">Approved</th>
                  <th className="px-4 py-2 text-right">Blocked</th>
                  <th className="px-4 py-2 text-right">Total submissions</th>
                </tr>
              </thead>
              <tbody>
                {interns.map((i) => (
                  <tr key={i.email} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-slate-500">{i.email}</div>
                    </td>
                    <td className="px-4 py-2 text-right">{i.in_progress}</td>
                    <td className="px-4 py-2 text-right">{i.awaiting_review}</td>
                    <td className="px-4 py-2 text-right">{i.approved}</td>
                    <td className="px-4 py-2 text-right">{i.blocked}</td>
                    <td className="px-4 py-2 text-right">{i.total_submissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Blocked queue */}
      <section>
        <h2 className="text-lg font-semibold">Blocked queue</h2>
        <p className="mt-1 text-sm text-slate-600">
          Records where an intern hit a blocker. Open one to fix the data,
          add a resolution note, and send it back to the pool.
        </p>

        {blocked.length === 0 ? (
          <div className="mt-3 rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No blocked records. Nice.
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Species</th>
                  <th className="px-4 py-2">Blocked by</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((r) => (
                  <tr key={r.ID} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono">{r.ID}</td>
                    <td className="px-4 py-2">
                      {r.fields["Scientific Name"] || "—"}
                    </td>
                    <td className="px-4 py-2">{r.assigned_to_name}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.intern_remarks}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/blocked/${encodeURIComponent(r.ID)}`}
                        className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
                      >
                        Resolve
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  pct,
}: {
  label: string;
  value: number;
  pct: string;
}) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2">{label}</td>
      <td className="px-4 py-2 text-right">{value}</td>
      <td className="px-4 py-2 text-right text-slate-500">{pct}</td>
    </tr>
  );
}
