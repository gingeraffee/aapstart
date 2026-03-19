import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ rotating_headers: ["Welcome to AAP Start"] });
}
