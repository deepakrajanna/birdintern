import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submitInternStatus } from "@/lib/records";
import type { InternStatus } from "@/lib/types";

const ALLOWED: InternStatus[] = [
  "Copied to Avifauna",
  "Duplicate",
  "Blocked",
];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { recordId?: string; status?: InternStatus; remarks?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { recordId, status, remarks = "" } = body;
  if (!recordId || !status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await submitInternStatus({
      recordId,
      internEmail: session.user.email,
      status,
      remarks,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Submit failed" },
      { status: 400 }
    );
  }
}
