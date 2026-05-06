import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reviewRecord } from "@/lib/records";
import type { SupervisorStatus } from "@/lib/types";

const ALLOWED: SupervisorStatus[] = ["Checked", "Reverted"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { recordId?: string; decision?: SupervisorStatus; remarks?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { recordId, decision, remarks = "" } = body;
  if (!recordId || !decision || !ALLOWED.includes(decision)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await reviewRecord({
      recordId,
      supervisorEmail: session.user.email,
      decision,
      remarks,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Review failed" },
      { status: 400 }
    );
  }
}
