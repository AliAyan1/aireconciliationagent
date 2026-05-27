import { NextResponse } from "next/server";
import { isAuthError, requireTeam } from "@/lib/auth";
import { isDatabaseConfigured, prisma } from "@/lib/db";

export async function POST() {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    if (isDatabaseConfigured()) {
      await prisma.$transaction([
        prisma.shareLink.deleteMany(),
        prisma.reconciliationSession.deleteMany(),
      ]);
    }

    return NextResponse.json({ ok: true, deletedAt: new Date().toISOString() });
  } catch (e) {
    console.error("delete-data", e);
    return NextResponse.json(
      { error: "Failed to delete reconciliation data" },
      { status: 500 }
    );
  }
}
