import { NextResponse } from "next/server";
import { getModule, getModuleUnfiltered } from "@/lib/content-loader";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track");

  const mod = track ? getModule(slug, track) : getModuleUnfiltered(slug);
  if (!mod) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  return NextResponse.json(mod);
}
