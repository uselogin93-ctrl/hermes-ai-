import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { count } from "drizzle-orm";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";
import { settings } from "@/lib/db/schema";

export type Db = ReturnType<typeof drizzlePostgres<typeof schema>>;

type DbGlobals = {
  dbPromise?: Promise<Db>;
  cleanup?: () => Promise<void>;
};

const globals = globalThis as unknown as DbGlobals;

function resolveMigrationsFolder(): string {
  const candidates = [
    path.join(process.cwd(), "drizzle"),
    path.join(process.cwd(), "apps", "web", "drizzle"),
    path.join(process.cwd(), "..", "..", "drizzle"),
  ];
  const found = candidates.find((candidate) => existsSync(path.join(candidate, "meta", "_journal.json")));
  return found ?? candidates[0]!;
}

async function ensureSettingsRow(db: Db): Promise<void> {
  const [row] = await db.select({ count: count() }).from(settings);
  if (!row || row.count === 0) {
    await db.insert(settings).values({});
  }
}

async function initEmbedded(): Promise<Db> {
  const dataDir = path.resolve(process.cwd(), env.pglitePath);
  // PGlite creates the leaf directory but not its parents.
  mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = new PGlite({ dataDir });
  const db = drizzlePglite(client, { schema }) as unknown as Db;

  await migratePglite(db as never, { migrationsFolder: resolveMigrationsFolder() });
  await ensureSettingsRow(db);

  globals.cleanup = async () => {
    await client.close();
  };

  return db;
}

async function initPostgres(): Promise<Db> {
  const client = postgres(env.databaseUrl, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });
  const db = drizzlePostgres(client, { schema });

  await migratePostgres(db, { migrationsFolder: resolveMigrationsFolder() });
  await ensureSettingsRow(db);

  globals.cleanup = async () => {
    await client.end({ timeout: 5 });
  };

  return db;
}

/**
 * Returns the database handle, running migrations once per process.
 *
 * `DATABASE_URL` selects a managed Postgres (Supabase in production). Without
 * it the app falls back to an embedded Postgres (PGlite) so the whole product
 * is runnable locally with no external services.
 */
export function getDb(): Promise<Db> {
  if (!globals.dbPromise) {
    globals.dbPromise = env.databaseUrl ? initPostgres() : initEmbedded();
  }
  return globals.dbPromise;
}

/** Closes the connection (used by scripts and tests). */
export async function closeDb(): Promise<void> {
  if (globals.cleanup) await globals.cleanup();
  globals.dbPromise = undefined;
  globals.cleanup = undefined;
}

export { schema };
export * from "@/lib/db/schema";
