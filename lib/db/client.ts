import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

// Lazy singleton — defers neon() call until first DB access so the module can
// be imported during Next.js build without DATABASE_URL being present.
let _instance: DB | undefined;

function getInstance(): DB {
  if (!_instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set.");
    }
    const sql = neon(process.env.DATABASE_URL);
    _instance = drizzle(sql, { schema });
  }
  return _instance;
}

export const db = new Proxy({} as DB, {
  get(_, prop: string | symbol) {
    const instance = getInstance();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    // eslint-disable-next-line @typescript-eslint/ban-types
    return typeof value === "function" ? (value as Function).bind(instance) : value;
  },
});
