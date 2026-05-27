import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { mapColumnsWithAI } from "@/lib/ai-dashboard";
import { isAuthError, requireTeam } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      headers?: string[];
      sampleRows?: Record<string, string>[];
    };
    if (!body.headers?.length) {
      return apiBadRequest("headers required.");
    }
    const mapping = await mapColumnsWithAI(
      body.headers,
      body.sampleRows ?? []
    );
    return NextResponse.json({ mapping });
  } catch (error) {
    return apiServerError(error, "POST /api/ai/column-map");
  }
}
