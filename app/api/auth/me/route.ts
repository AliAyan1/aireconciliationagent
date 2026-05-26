import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();
  return NextResponse.json({ user });
}
