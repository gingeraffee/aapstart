import { NextResponse } from "next/server";
import { getAllPublishedModules } from "@/lib/content-loader";

export async function GET() {
  const modules = getAllPublishedModules();
  return NextResponse.json(modules);
}
