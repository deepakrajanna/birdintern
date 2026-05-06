import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getRecordById } from "@/lib/records";
import RecordView from "@/components/RecordView";
import SubmitForm from "./SubmitForm";

export const dynamic = "force-dynamic";

export default async function InternRecordPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const record = await getRecordById(params.id);
  if (!record) notFound();

  // Only the assignee can see this page (admins/supervisors have other views).
  const me = session.user.email.toLowerCase();
  if (record.assigned_to_email !== me) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        This record is not assigned to you.
      </div>
    );
  }

  const alreadySubmitted = !!record.intern_status;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Record #{record.ID}</h1>
        <p className="text-sm text-slate-600">
          Copy these fields into Avifauna, then mark the outcome below.
        </p>
      </div>

      {record.last_revert_reason && (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm">
          <strong>Previously reverted:</strong> {record.last_revert_reason}
        </div>
      )}

      {record.admin_resolution_note && (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm">
          <strong>Admin note:</strong> {record.admin_resolution_note}
        </div>
      )}

      <RecordView record={record} />

      {alreadySubmitted ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          You marked this <strong>{record.intern_status}</strong>. It's now
          out of your queue.
        </div>
      ) : (
        <SubmitForm recordId={record.ID} />
      )}
    </div>
  );
}
