import { listAdminBlockedQueue } from "@/lib/records";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const blocked = await listAdminBlockedQueue();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

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

      <section>
        <h2 className="text-lg font-semibold">Other admin actions</h2>
        <ul className="mt-2 list-disc pl-6 text-sm text-slate-600">
          <li>
            Manage users: edit the <code>users</code> tab in the Sheet
            directly. Add a row with email, role (intern/supervisor/admin),
            and active=true.
          </li>
          <li>
            Inspect any record via the supervisor page (admins are allowed).
          </li>
        </ul>
      </section>
    </div>
  );
}
