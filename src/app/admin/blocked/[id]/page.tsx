import { notFound } from "next/navigation";
import { getRecordById } from "@/lib/records";
import RecordView from "@/components/RecordView";
import ResolveForm from "./ResolveForm";

export const dynamic = "force-dynamic";

export default async function ResolveBlockedPage({
  params,
}: {
  params: { id: string };
}) {
  const record = await getRecordById(params.id);
  if (!record) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resolve blocked record #{record.ID}</h1>
        <p className="text-sm text-slate-600">
          Blocked by {record.assigned_to_name} ({record.assigned_to_email})
        </p>
      </div>

      <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm">
        <strong>Intern's question:</strong> {record.intern_remarks}
      </div>

      <RecordView record={record} />

      {record.state === "blocked_admin_queue" ? (
        <ResolveForm record={record} />
      ) : (
        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
          This record is no longer in the blocked queue.
        </div>
      )}
    </div>
  );
}
