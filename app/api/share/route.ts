import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isAuthError, requireTeam } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import type { ShareSnapshot } from "@/lib/share-snapshot";
import type { SessionAuditMeta } from "@/lib/audit-certificate";
import type { MatchResult, ReconciliationSummary } from "@/lib/types";

const SHARE_TTL_DAYS = 7;

export async function POST(req: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Share links require database configuration" },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as {
      sessionId?: string;
      results: MatchResult[];
      summary: ReconciliationSummary;
      auditMeta?: SessionAuditMeta;
    };

    if (!body.results?.length || !body.summary) {
      return NextResponse.json(
        { error: "results and summary required" },
        { status: 400 }
      );
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHARE_TTL_DAYS);

    const snapshot: ShareSnapshot = {
      results: body.results,
      summary: body.summary,
      auditMeta: body.auditMeta,
      sharedAt: new Date().toISOString(),
    };

    await prisma.shareLink.create({
      data: {
        token,
        expiresAt,
        sessionId: body.sessionId ?? null,
        payload: JSON.parse(
          JSON.stringify(snapshot)
        ) as Prisma.InputJsonValue,
        createdBy: auth.email ?? null,
      },
    });

    return NextResponse.json({ token, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error("share create", e);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}
