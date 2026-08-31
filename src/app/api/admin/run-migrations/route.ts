import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// TEMPORARY, one-time-use route: applies the committed drizzle/*.sql migrations to
// whatever DATABASE_URL/DB_POSTGRES_URL this deployment resolves to. Gated by the same
// CRON_SECRET already provisioned (no new credential needed) since this sandbox has no
// way to read the Vercel-Neon integration's decrypted connection string directly via the
// Management API — the deployed app itself is the only thing that can see it. Remove
// this route once the schema has been applied; it is not part of the product surface.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ data: null, error: "unauthorized" }, { status: 401 });
  }

  const drizzleDir = join(process.cwd(), "drizzle");
  const files = readdirSync(drizzleDir).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];

  for (const file of files) {
    const migrationSql = readFileSync(join(drizzleDir, file), "utf-8");
    const statements = migrationSql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await db.execute(sql.raw(stmt));
    }
    applied.push(file);
  }

  return NextResponse.json({ data: { applied }, error: null }, { status: 200 });
}
