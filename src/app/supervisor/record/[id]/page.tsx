import { notFound } from "next/navigation";
import { getRecordById } from "@/lib/records";
import RecordView from "@/components/RecordView";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

export default async function SupervisorInspect({
  params,
}: {
  params: { id: string };
}) {
  const record = await getRecordById(params.id);
  if (!record) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inspect record #{record.ID}</h1>
        <p className="text-sm text-slate-600">
          Submitted by {record.assigned_to_name} ({record.assigned_to_email})
        </p>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4 text-sm">
        <div>
          <strong>Intern marked:</strong> {record.intern_status}
        </div>
        {record.intern_remarks && (
          <div className="mt-1">
            <strong>Intern remarks:</strong> {record.intern_remarks}
          </div>
        )}
      </div>

      <RecordView record={record} />

      {record.state === "submitted_to_supervisor" ? (
        <ReviewForm recordId={record.ID} />
      ) : (
        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
          This record is no longer awaiting review. Current state:{" "}
          <strong>{record.state}</strong>.
        </div>
      )}
    </div>
  );
}
