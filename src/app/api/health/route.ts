import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// ISC-119: external synthetic monitoring of the product itself.
// TEMPORARY debug affordance: with the correct Authorization header, includes the raw
// connection error — gated by CRON_SECRET (no new credential), removed once the Neon
// connection issue is diagnosed. ISC-107 (no stack traces to anonymous callers) still
// holds: the unauthenticated path never sees anything beyond "degraded"/"unreachable".
export async function GET(req: NextRequest) {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ data: { status: "ok", db: "connected" }, error: null }, { status: 200 });
  } catch (err) {
    const debug = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
    const detail = debug ? (err instanceof Error ? `${err.name}: ${err.message}` : String(err)) : undefined;
    return NextResponse.json({ data: { status: "degraded", db: "unreachable", detail }, error: null }, { status: 200 });
  }
}
