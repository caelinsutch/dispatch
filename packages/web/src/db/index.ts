import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

/**
 * Get the Drizzle database instance.
 * This must be called at runtime within a request context.
 */
export async function getDb(): Promise<DrizzleD1Database<typeof schema>> {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}

// Re-export schema for convenience
export * from "./schema";
