import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import { APP_REPORT_FILENAME_PREFIX } from "@/lib/branding";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import { buildJournalCsv, journalPostsToAuditRows } from "@/lib/journal-csv-export";
import type { JournalPost } from "@/lib/types";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      sessionId?: string;
      journalPosts?: JournalPost[];
    };

    if (body.sessionId && isDatabaseConfigured()) {
      const rows = await prisma.journalPost.findMany({
        where: { sessionId: body.sessionId },
        orderBy: { createdAt: "asc" },
      });
      const auditRows = rows.map((j) => ({
        timestamp: j.createdAt.toISOString(),
        action: j.action,
        description: j.description,
        amount:
          j.bankAmount != null
            ? String(j.bankAmount)
            : j.ledgerAmount != null
              ? String(j.ledgerAmount)
              : "",
        performedBy: j.performedBy,
      }));
      const csv = buildJournalCsv(auditRows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${APP_REPORT_FILENAME_PREFIX}-journal-log.csv"`,
        },
      });
    }

    if (!body.journalPosts?.length) {
      return apiBadRequest("journalPosts or sessionId required");
    }

    const csv = buildJournalCsv(journalPostsToAuditRows(body.journalPosts));
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${APP_REPORT_FILENAME_PREFIX}-journal-log.csv"`,
      },
    });
  } catch (error) {
    return apiServerError(error, "POST /api/journal-export");
  }
}
