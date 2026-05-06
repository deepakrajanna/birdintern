import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  computeInternStats,
  findOpenClaimsForIntern,
} from "@/lib/records";
import ClaimButton from "./ClaimButton";

export const dynamic = "force-dynamic";

export default async function InternHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const [stats, openClaims] = await Promise.all([
    computeInternStats(session.user.email),
    findOpenClaimsForIntern(session.user.email),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hello, {session.user.name}</h1>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Records worked on" value={stats.workedOn} />
        <Stat label="Approved by supervisor" value={stats.approved} />
      </div>

      {openClaims.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">In progress</h2>
          <p className="mt-1 text-sm text-slate-600">
            {openClaims.length === 1
              ? "1 record you've claimed but not yet submitted."
              : `${openClaims.length} records you've claimed but not yet submitted.`}
          </p>
          <ul className="mt-4 divide-y divide-slate-100">
            {openClaims.map((r) => (
              <li
                key={r.ID}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <div className="font-medium">Record #{r.ID}</div>
                  <div className="text-xs text-slate-500">
                    {r.fields["Scientific Name"] || ""}
                  </div>
                </div>
                <a
                  href={`/intern/record/${encodeURIComponent(r.ID)}`}
                  className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
                >
                  Resume
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          {openClaims.length > 0
            ? "Or start a fresh record."
            : "Ready to work on a new record?"}
        </p>
        <ClaimButton />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}
