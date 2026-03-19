import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json({
    employee_id: body.employee_id ?? "dev-001",
    first_name: body.first_name ?? "Dev",
    last_name: body.last_name ?? "User",
    full_name: `${body.first_name ?? "Dev"} ${body.last_name ?? "User"}`.trim(),
    track: "administrative",
    is_admin: false,
  });
}
