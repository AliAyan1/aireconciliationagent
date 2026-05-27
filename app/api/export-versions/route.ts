import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import { isDatabaseConfigured, prisma } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return apiBadRequest("sessionId required");

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ versions: [] });
  }

  try {
    const rows = await prisma.reportExport.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({
      versions: rows.map((r) => ({
        id: r.id,
        version: r.version,
        format: r.format,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        matchRate: r.matchRate ?? undefined,
      })),
    });
  } catch (error) {
    return apiServerError(error, "GET /api/export-versions");
  }
}

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ version: null });
  }

  try {
    const body = (await request.json()) as {
      sessionId?: string;
      format?: string;
      note?: string;
      matchRate?: number;
    };
    if (!body.sessionId || !body.format) {
      return apiBadRequest("sessionId and format required");
    }

    const last = await prisma.reportExport.findFirst({
      where: { sessionId: body.sessionId },
      orderBy: { version: "desc" },
    });
    const version = (last?.version ?? 0) + 1;

    const row = await prisma.reportExport.create({
      data: {
        sessionId: body.sessionId,
        version,
        format: body.format,
        note: body.note ?? null,
        matchRate: body.matchRate ?? null,
      },
    });

    return NextResponse.json({
      version: {
        id: row.id,
        version: row.version,
        format: row.format,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
        matchRate: row.matchRate ?? undefined,
      },
    });
  } catch (error) {
    return apiServerError(error, "POST /api/export-versions");
  }
}
