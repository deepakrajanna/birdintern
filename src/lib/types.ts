// Shared types for the app.

export type Role = "intern" | "supervisor" | "admin";

export type RecordState =
  | "unassigned"
  | "claimed"
  | "submitted_to_supervisor"
  | "blocked_admin_queue"
  | "approved";

export type InternStatus = "Copied to Avifauna" | "Duplicate" | "Blocked";
export type SupervisorStatus = "Checked" | "Reverted";

// Names of the workflow columns we add to the records sheet (on top of the
// existing CSV columns). Code looks columns up by header name, so as long as
// these strings appear in row 1 of the records tab, ordering doesn't matter.
export const WORKFLOW_COLUMNS = [
  "assigned_to_email",
  "assigned_to_name",
  "assigned_at",
  "intern_status",
  "intern_remarks",
  "intern_submitted_at",
  "supervisor_email",
  "supervisor_status",
  "supervisor_remarks",
  "supervisor_reviewed_at",
  "last_revert_reason",
  "last_revert_by",
  "admin_resolution_note",
  "state",
] as const;

export type WorkflowColumn = (typeof WORKFLOW_COLUMNS)[number];

export interface UserRow {
  email: string;
  google_sub: string;
  name: string;
  role: Role;
  active: boolean;
  added_at: string;
}

// A bird record. The fixed CSV columns are typed; the rest live in `extra`.
export interface BirdRecord {
  // Sheet row number (1-indexed; row 2 is the first data row).
  rowNumber: number;
  ID: string;

  // Workflow fields
  assigned_to_email: string;
  assigned_to_name: string;
  assigned_at: string;
  intern_status: InternStatus | "";
  intern_remarks: string;
  intern_submitted_at: string;
  supervisor_email: string;
  supervisor_status: SupervisorStatus | "";
  supervisor_remarks: string;
  supervisor_reviewed_at: string;
  last_revert_reason: string;
  last_revert_by: string;
  admin_resolution_note: string;
  state: RecordState;

  // Everything else from the CSV (Scientific Name, Sex, Lattitude, etc.) is
  // exposed by header name so we can render it generically.
  fields: Record<string, string>;
}

export interface AuditEntry {
  timestamp: string;
  actor_email: string;
  action: string;
  record_id: string;
  details: string;
}
