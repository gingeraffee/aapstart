import { NextResponse } from "next/server";
import { getModulesForTrack } from "@/lib/content-loader";

export async function GET() {
  const modules = getModulesForTrack("administrative");
  return NextResponse.json(modules);
}
