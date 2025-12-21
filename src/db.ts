import "dotenv/config";
import { Client } from "pg";
import type { ClientConfig } from "pg";

let client: Client | null = null;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function requirePassword(pass: string | undefined, source: "DATABASE_URL" | "PGPASSWORD"): string {
  if (typeof pass !== "string" || pass.trim() === "") {
    fail(`Postgres password is missing or invalid. Check ${source}.`);
  }
  return pass;
}

function buildConfig(): ClientConfig {
  const urlEnv = process.env.DATABASE_URL;
  if (urlEnv) {
    let parsed: URL;
    try {
      parsed = new URL(urlEnv);
    } catch (err: any) {
      fail(`Invalid DATABASE_URL: ${err?.message || "parse_error"}`);
    }
    const password = requirePassword(parsed.password ? decodeURIComponent(parsed.password) : "", "DATABASE_URL");
    const user = parsed.username ? decodeURIComponent(parsed.username) : undefined;
    const database = parsed.pathname?.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
    const port = parsed.port ? Number(parsed.port) : 5432;
    let host = parsed.hostname;
    if (["postgres", "db", "base"].includes(host) && !process.env.DOCKER_ENV) {
      console.warn(`Postgres host "${host}" not resolvable locally, falling back to localhost`);
      host = "localhost";
    }
    return { host, port, user, password, database };
  }

  const password = requirePassword(process.env.PGPASSWORD, "PGPASSWORD");
  return {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER,
    password,
    database: process.env.PGDATABASE
  };
}

export async function getClient(): Promise<Client> {
  if (client) return client;
  const cfg = buildConfig();
  client = new Client(cfg);
  try {
    await client.connect();
    await client.query("SELECT 1");
  } catch (err: any) {
    console.error("Cannot connect to PostgreSQL. Check DATABASE_URL or container network.", { error: err?.message });
    process.exit(1);
  }
  return client;
}

export async function closeClient(): Promise<void> {
  if (client) {
    await client.end().catch(() => {});
    client = null;
  }
}


