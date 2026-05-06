import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { claimNextRecord } from "@/lib/records";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const record = await claimNextRecord(
      session.user.email,
      session.user.name || session.user.email
    );
    if (!record) {
      return NextResponse.json(
        { error: "No records available to claim" },
        { status: 404 }
      );
    }
    return NextResponse.json({ recordId: record.ID });
  } catch (e) {
    console.error("[claim] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Claim failed" },
      { status: 500 }
    );
  }
}
