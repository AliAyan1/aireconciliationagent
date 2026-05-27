import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { predictMatchRate } from "@/lib/ai-dashboard";
import { isAuthError, requireTeam } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      bankSample?: { description: string; amount: number; date: string }[];
      ledgerSample?: { description: string; amount: number; date: string }[];
    };
    if (!body.bankSample?.length || !body.ledgerSample?.length) {
      return apiBadRequest("bankSample and ledgerSample required.");
    }
    const estimate = await predictMatchRate(body.bankSample, body.ledgerSample);
    return NextResponse.json({ estimate });
  } catch (error) {
    return apiServerError(error, "POST /api/ai/predict-rate");
  }
}
