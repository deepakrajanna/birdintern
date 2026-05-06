import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveBlockedRecord } from "@/lib/records";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    recordId?: string;
    resolutionNote?: string;
    fieldEdits?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { recordId, resolutionNote, fieldEdits } = body;
  if (!recordId || !resolutionNote) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await resolveBlockedRecord({
      recordId,
      adminEmail: session.user.email,
      resolutionNote,
      fieldEdits,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Resolve failed" },
      { status: 400 }
    );
  }
}
