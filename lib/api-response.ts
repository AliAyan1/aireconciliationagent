import { NextResponse } from "next/server";

export function apiBadRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function apiNotFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function apiServerError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
  return NextResponse.json(
    { error: "An unexpected error occurred. Please try again." },
    { status: 500 }
  );
}
