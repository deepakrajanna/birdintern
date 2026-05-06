import { readTab, headerIndex, updateRowCells, TAB } from "./sheets";
import { withClaimLock } from "./lock";
import { logAudit, listAudit } from "./audit";
import { listUsers } from "./users";
import type {
  BirdRecord,
  InternStatus,
  RecordState,
  SupervisorStatus,
} from "./types";

// --- Internal helpers --------------------------------------------------------

interface LoadedSheet {
  rows: string[][];
  header: Map<string, number>;
}

async function loadRecordsSheet(): Promise<LoadedSheet> {
  const rows = await readTab(TAB.records);
  const header = headerIndex(rows);
  return { rows, header };
}

function rowToRecord(
  row: string[],
  rowNumber: number,
  header: Map<string, number>
): BirdRecord {
  const get = (name: string) => row[header.get(name) ?? -1] ?? "";
  const fields: Record<string, string> = {};
  for (const [name, idx] of header.entries()) {
    fields[name] = row[idx] ?? "";
  }
  return {
    rowNumber,
    ID: get("ID"),
    assigned_to_email: get("assigned_to_email").toLowerCase(),
    assigned_to_name: get("assigned_to_name"),
    assigned_at: get("assigned_at"),
    intern_status: (get("intern_status") || "") as InternStatus | "",
    intern_remarks: get("intern_remarks"),
    intern_submitted_at: get("intern_submitted_at"),
    supervisor_email: get("supervisor_email").toLowerCase(),
    supervisor_status: (get("supervisor_status") || "") as
      | SupervisorStatus
      | "",
    supervisor_remarks: get("supervisor_remarks"),
    supervisor_reviewed_at: get("supervisor_reviewed_at"),
    last_revert_reason: get("last_revert_reason"),
    last_revert_by: get("last_revert_by"),
    admin_resolution_note: get("admin_resolution_note"),
    state: (get("state") || "unassigned") as RecordState,
    fields,
  };
}

async function loadAllRecords(): Promise<BirdRecord[]> {
  const { rows, header } = await loadRecordsSheet();
  return rows.slice(1).map((r, i) => rowToRecord(r, i + 2, header));
}

// --- Public API --------------------------------------------------------------

export async function getRecordById(id: string): Promise<BirdRecord | null> {
  const all = await loadAllRecords();
  return all.find((r) => r.ID === id) ?? null;
}

/** All records the intern has claimed but not yet submitted. */
export async function findOpenClaimsForIntern(
  email: string
): Promise<BirdRecord[]> {
  const all = await loadAllRecords();
  const lower = email.toLowerCase();
  return all.filter(
    (r) =>
      r.assigned_to_email === lower &&
      r.state === "claimed" &&
      !r.intern_status
  );
}

/**
 * Atomically claim the next unassigned record for the given intern.
 * Interns may hold multiple open claims at once; this always picks up
 * a fresh record rather than redirecting to an existing claim.
 */
export async function claimNextRecord(
  internEmail: string,
  internName: string
): Promise<BirdRecord | null> {
  return withClaimLock(async () => {
    const { rows, header } = await loadRecordsSheet();
    const dataRows = rows.slice(1);

    // First record with no assignment and no submission yet.
    const targetIdx = dataRows.findIndex((r) => {
      const get = (name: string) => r[header.get(name) ?? -1] ?? "";
      const state = get("state") || "unassigned";
      const assigned = get("assigned_to_email");
      const internStatus = get("intern_status");
      return state === "unassigned" && !assigned && !internStatus;
    });
    if (targetIdx === -1) return null;

    const rowNumber = targetIdx + 2;
    const now = new Date().toISOString();

    await updateRowCells(TAB.records, rowNumber, header, {
      assigned_to_email: internEmail.toLowerCase(),
      assigned_to_name: internName,
      assigned_at: now,
      state: "claimed",
    });

    const record = rowToRecord(
      dataRows[targetIdx],
      rowNumber,
      header
    );
    record.assigned_to_email = internEmail.toLowerCase();
    record.assigned_to_name = internName;
    record.assigned_at = now;
    record.state = "claimed";

    await logAudit(internEmail, "claim", record.ID);
    return record;
  });
}

/** Save the intern's status + remarks for a claimed record. */
export async function submitInternStatus(args: {
  recordId: string;
  internEmail: string;
  status: InternStatus;
  remarks: string;
}): Promise<BirdRecord> {
  const { recordId, internEmail, status, remarks } = args;

  if (status === "Blocked" && !remarks.trim()) {
    throw new Error("Remarks are required when status is Blocked");
  }

  const record = await getRecordById(recordId);
  if (!record) throw new Error("Record not found");
  if (record.assigned_to_email !== internEmail.toLowerCase()) {
    throw new Error("This record is not assigned to you");
  }
  if (record.intern_status) {
    throw new Error("This record has already been submitted");
  }

  const { header } = await loadRecordsSheet();
  const now = new Date().toISOString();
  const newState: RecordState =
    status === "Blocked" ? "blocked_admin_queue" : "submitted_to_supervisor";

  await updateRowCells(TAB.records, record.rowNumber, header, {
    intern_status: status,
    intern_remarks: remarks,
    intern_submitted_at: now,
    state: newState,
  });

  await logAudit(internEmail, `submit:${status}`, recordId, remarks);

  return {
    ...record,
    intern_status: status,
    intern_remarks: remarks,
    intern_submitted_at: now,
    state: newState,
  };
}

/** Records currently waiting for supervisor review. */
export async function listSupervisorQueue(): Promise<BirdRecord[]> {
  const all = await loadAllRecords();
  return all.filter((r) => r.state === "submitted_to_supervisor");
}

/** Records currently waiting for admin to unblock. */
export async function listAdminBlockedQueue(): Promise<BirdRecord[]> {
  const all = await loadAllRecords();
  return all.filter((r) => r.state === "blocked_admin_queue");
}

/** Supervisor marks a record Checked or Reverted. */
export async function reviewRecord(args: {
  recordId: string;
  supervisorEmail: string;
  decision: SupervisorStatus;
  remarks: string;
}): Promise<void> {
  const { recordId, supervisorEmail, decision, remarks } = args;

  if (decision === "Reverted" && !remarks.trim()) {
    throw new Error("Remarks are required when reverting a record");
  }

  const record = await getRecordById(recordId);
  if (!record) throw new Error("Record not found");
  if (record.state !== "submitted_to_supervisor") {
    throw new Error("Record is not awaiting supervisor review");
  }

  const { header } = await loadRecordsSheet();
  const now = new Date().toISOString();

  if (decision === "Checked") {
    await updateRowCells(TAB.records, record.rowNumber, header, {
      supervisor_email: supervisorEmail.toLowerCase(),
      supervisor_status: "Checked",
      supervisor_remarks: remarks,
      supervisor_reviewed_at: now,
      state: "approved",
    });
  } else {
    // Revert: clear intern fields, drop to pool, preserve the reason on the row
    // and a full breadcrumb in the audit log.
    await updateRowCells(TAB.records, record.rowNumber, header, {
      assigned_to_email: "",
      assigned_to_name: "",
      assigned_at: "",
      intern_status: "",
      intern_remarks: "",
      intern_submitted_at: "",
      supervisor_email: supervisorEmail.toLowerCase(),
      supervisor_status: "Reverted",
      supervisor_remarks: remarks,
      supervisor_reviewed_at: now,
      last_revert_reason: remarks,
      last_revert_by: supervisorEmail.toLowerCase(),
      state: "unassigned",
    });
  }

  await logAudit(
    supervisorEmail,
    `review:${decision}`,
    recordId,
    `previous_intern=${record.assigned_to_email}; remarks=${remarks}`
  );
}

/**
 * Admin resolves a blocked record. Optionally rewrites underlying record
 * fields, captures a resolution note, and returns the row to the pool.
 */
export async function resolveBlockedRecord(args: {
  recordId: string;
  adminEmail: string;
  resolutionNote: string;
  fieldEdits?: Record<string, string>;
}): Promise<void> {
  const { recordId, adminEmail, resolutionNote, fieldEdits } = args;

  if (!resolutionNote.trim()) {
    throw new Error("A resolution note is required");
  }

  const record = await getRecordById(recordId);
  if (!record) throw new Error("Record not found");
  if (record.state !== "blocked_admin_queue") {
    throw new Error("Record is not in the blocked queue");
  }

  const { header } = await loadRecordsSheet();

  const updates: Record<string, string> = {
    ...(fieldEdits || {}),
    assigned_to_email: "",
    assigned_to_name: "",
    assigned_at: "",
    intern_status: "",
    intern_remarks: "",
    intern_submitted_at: "",
    admin_resolution_note: resolutionNote,
    state: "unassigned",
  };

  await updateRowCells(TAB.records, record.rowNumber, header, updates);

  await logAudit(
    adminEmail,
    "admin_resolve",
    recordId,
    `note=${resolutionNote}; fields_edited=${Object.keys(fieldEdits || {}).join(",")}`
  );
}

// --- Stats -------------------------------------------------------------------

export interface InternStats {
  workedOn: number; // count of submit events by this intern in the audit log
  approved: number; // records currently approved with this intern listed
}

export async function computeInternStats(
  internEmail: string
): Promise<InternStats> {
  const lower = internEmail.toLowerCase();
  const [audit, all] = await Promise.all([listAudit(), loadAllRecords()]);

  const workedOn = audit.filter(
    (e) => e.actor_email === lower && e.action.startsWith("submit:")
  ).length;

  const approved = all.filter(
    (r) => r.state === "approved" && r.assigned_to_email === lower
  ).length;

  return { workedOn, approved };
}

// --- Admin dashboard ---------------------------------------------------------

export interface OverallStats {
  total: number;
  unassigned: number;
  in_progress: number; // claimed but not yet submitted
  awaiting_supervisor: number;
  blocked: number;
  approved: number;
}

export async function computeOverallStats(): Promise<OverallStats> {
  const all = await loadAllRecords();
  return {
    total: all.length,
    unassigned: all.filter((r) => r.state === "unassigned").length,
    in_progress: all.filter((r) => r.state === "claimed").length,
    awaiting_supervisor: all.filter(
      (r) => r.state === "submitted_to_supervisor"
    ).length,
    blocked: all.filter((r) => r.state === "blocked_admin_queue").length,
    approved: all.filter((r) => r.state === "approved").length,
  };
}

export interface InternProgress {
  email: string;
  name: string;
  in_progress: number;
  awaiting_review: number;
  approved: number;
  blocked: number;
  total_submissions: number; // lifetime submit events from audit log
}

export async function computeInternProgress(): Promise<InternProgress[]> {
  const [all, users, audit] = await Promise.all([
    loadAllRecords(),
    listUsers(),
    listAudit(),
  ]);
  const interns = users.filter((u) => u.role === "intern" && u.active);

  const rows = interns.map<InternProgress>((u) => {
    const mine = all.filter((r) => r.assigned_to_email === u.email);
    return {
      email: u.email,
      name: u.name || u.email,
      in_progress: mine.filter((r) => r.state === "claimed").length,
      awaiting_review: mine.filter(
        (r) => r.state === "submitted_to_supervisor"
      ).length,
      approved: mine.filter((r) => r.state === "approved").length,
      blocked: mine.filter((r) => r.state === "blocked_admin_queue").length,
      total_submissions: audit.filter(
        (e) =>
          e.actor_email === u.email && e.action.startsWith("submit:")
      ).length,
    };
  });

  // Most active interns first; tie-break alphabetically.
  rows.sort(
    (a, b) =>
      b.total_submissions - a.total_submissions ||
      a.name.localeCompare(b.name)
  );
  return rows;
}
