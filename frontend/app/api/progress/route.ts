import { NextResponse } from "next/server";
import { getAll } from "@/lib/dev-progress-store";

export async function GET() {
  return NextResponse.json(getAll());
}
