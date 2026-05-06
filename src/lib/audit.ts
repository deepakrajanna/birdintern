import { appendRows, readTab, headerIndex, TAB } from "./sheets";
import type { AuditEntry } from "./types";

export async function logAudit(
  actorEmail: string,
  action: string,
  recordId: string,
  details: string = ""
): Promise<void> {
  const row = [new Date().toISOString(), actorEmail, action, recordId, details];
  try {
    await appendRows(TAB.audit, [row]);
  } catch (e) {
    // Audit failures should never block the user's workflow.
    console.error("[audit] failed to log entry:", e);
  }
}

export async function listAudit(): Promise<AuditEntry[]> {
  const rows = await readTab(TAB.audit);
  const header = headerIndex(rows);
  const get = (r: string[], name: string) => r[header.get(name) ?? -1] ?? "";
  return rows.slice(1).map((r) => ({
    timestamp: get(r, "timestamp"),
    actor_email: get(r, "actor_email").toLowerCase(),
    action: get(r, "action"),
    record_id: get(r, "record_id"),
    details: get(r, "details"),
  }));
}
