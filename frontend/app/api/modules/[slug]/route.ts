import { NextResponse } from "next/server";
import { getModule } from "@/lib/content-loader";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const mod = getModule(slug, "administrative");
  if (!mod) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  return NextResponse.json(mod);
}
