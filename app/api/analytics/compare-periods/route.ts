import { NextResponse } from "next/server";
import { apiServerError } from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { prisma } from "@/lib/db";
import { listSessions } from "@/lib/db-helpers";
import {
  buildPeriodComparison,
  type SessionPeriodSnapshot,
} from "@/lib/period-comparison";

export async function GET() {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  try {
    const sessions = await listSessions(100);

    if (sessions.length < 2) {
      return NextResponse.json({
        sessionCount: sessions.length,
        needsMoreSessions: true,
        comparison: null,
      });
    }

    const snapshots: SessionPeriodSnapshot[] = sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      matchRate: s.matchRate,
      totalUnmatched: s.totalUnmatched,
      bankFileName: s.bankFileName,
    }));

    const sessionIds = sessions.map((s) => s.id);
    const unmatchedRows = await prisma.matchResult.findMany({
      where: {
        sessionId: { in: sessionIds },
        status: "UNMATCHED",
      },
      select: {
        sessionId: true,
        bankTransaction: { select: { description: true } },
        ledgerEntry: { select: { description: true } },
      },
    });

    const bySession = new Map<string, string[]>();
    for (const row of unmatchedRows) {
      const desc =
        row.bankTransaction?.description ??
        row.ledgerEntry?.description ??
        "";
      if (!desc) continue;
      const list = bySession.get(row.sessionId) ?? [];
      list.push(desc);
      bySession.set(row.sessionId, list);
    }

    const unmatchedBySession = [...bySession.entries()].map(
      ([sessionId, descriptions]) => ({ sessionId, descriptions })
    );

    const comparison = buildPeriodComparison(snapshots, unmatchedBySession);

    return NextResponse.json({
      sessionCount: sessions.length,
      needsMoreSessions: false,
      comparison,
    });
  } catch (error) {
    return apiServerError(error, "GET /api/analytics/compare-periods");
  }
}
