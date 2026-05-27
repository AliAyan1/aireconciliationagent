import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import type { ShareSnapshot } from "@/lib/share-snapshot";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const link = await prisma.shareLink.findUnique({ where: { token } });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    if (link.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    return NextResponse.json({
      snapshot: link.payload as unknown as ShareSnapshot,
      expiresAt: link.expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("share get", e);
    return NextResponse.json({ error: "Failed to load share" }, { status: 500 });
  }
}
