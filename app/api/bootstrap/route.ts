import { NextResponse } from "next/server";

import { getBootstrap } from "@/lib/data";

export async function GET() {
  return NextResponse.json(await getBootstrap());
}
