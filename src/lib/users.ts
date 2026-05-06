import { readTab, headerIndex, TAB } from "./sheets";
import type { Role, UserRow } from "./types";

// Cache user list briefly so we don't hit the Sheet on every request.
let cache: { ts: number; rows: UserRow[] } | null = null;
const TTL_MS = 60_000;

export async function listUsers(): Promise<UserRow[]> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.rows;

  const rows = await readTab(TAB.users);
  const header = headerIndex(rows);
  const get = (r: string[], name: string) => r[header.get(name) ?? -1] ?? "";

  const users: UserRow[] = rows.slice(1).map((r) => ({
    email: get(r, "email").trim().toLowerCase(),
    google_sub: get(r, "google_sub"),
    name: get(r, "name"),
    role: (get(r, "role") || "intern") as Role,
    active: (get(r, "active") || "").toLowerCase() === "true",
    added_at: get(r, "added_at"),
  }));

  cache = { ts: Date.now(), rows: users };
  return users;
}

/** Bypass the cache (used right after a write). */
export function invalidateUserCache(): void {
  cache = null;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const lower = email.toLowerCase();
  const all = await listUsers();
  return all.find((u) => u.email === lower) ?? null;
}
