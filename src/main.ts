import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { closeClient, getClient } from "./db";
import { loadRawPending } from "./load_raw";
import { parseRawToNormalized } from "./parse";
import { recordRunStart, recordRunEnd, upsertNormalized } from "./persist";

async function main() {
  const runId = uuidv4();
  const startedAt = new Date().toISOString();
  let processed = 0;
  let errors = 0;

  const client = await getClient();
  await client.query("BEGIN");

  await recordRunStart({
    run_id: runId,
    started_at: startedAt,
    finished_at: null,
    status: "ok",
    processed: 0,
    errors: 0
  });

  await client.query("SAVEPOINT after_start");

  try {
    const raws = await loadRawPending(20);
    console.log(`normalizer load_raw_pending count=${raws.length}`);
    for (const raw of raws) {
      const normalized = parseRawToNormalized(raw);
      await upsertNormalized(normalized);
      processed += 1;
    }
    await recordRunEnd(runId, "ok", new Date().toISOString(), processed, errors);
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK TO SAVEPOINT after_start");
    processed = 0;
    errors = 1;
    await recordRunEnd(runId, "error", new Date().toISOString(), processed, errors);
    await client.query("COMMIT");
    console.error(err);
    throw err;
  } finally {
    await closeClient();
  }
}

main().catch(() => process.exit(1));
