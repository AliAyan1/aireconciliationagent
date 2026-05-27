import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import { runTestSuite } from "@/lib/test-runner";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const bankCSV = body.bankCSV as string | undefined;
    const ledgerCSV = body.ledgerCSV as string | undefined;
    const datasetName = (body.datasetName as string | undefined)?.trim() || "Unnamed dataset";

    if (typeof bankCSV !== "string" || !bankCSV.trim()) {
      return apiBadRequest("bankCSV is required.");
    }
    if (typeof ledgerCSV !== "string" || !ledgerCSV.trim()) {
      return apiBadRequest("ledgerCSV is required.");
    }

    const result = runTestSuite(bankCSV, ledgerCSV, datasetName);

    return NextResponse.json({ result });
  } catch (error) {
    return apiServerError(error, "POST /api/test-run");
  }
}
