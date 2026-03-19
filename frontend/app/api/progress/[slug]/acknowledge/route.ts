import { NextResponse } from "next/server";
import { acknowledge } from "@/lib/dev-progress-store";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const entry = acknowledge(slug);
  return NextResponse.json(entry);
}
