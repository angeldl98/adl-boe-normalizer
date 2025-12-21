import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { closeClient } from "./db";
import { loadRawPending } from "./load_raw";
import { parseRawToNormalized } from "./parse";
import { recordRunStart, recordRunEnd, upsertNormalized } from "./persist";

async function main() {
  const runId = uuidv4();
  const startedAt = new Date().toISOString();
  let processed = 0;
  let errors = 0;

  await recordRunStart({
    run_id: runId,
    started_at: startedAt,
    finished_at: null,
    status: "ok",
    processed: 0,
    errors: 0
  });

  try {
    const raws = await loadRawPending(100);
    for (const raw of raws) {
      try {
        const normalized = parseRawToNormalized(raw);
        await upsertNormalized(normalized);
        processed += 1;
      } catch (err: any) {
        errors += 1;
        console.error("normalize_error", { raw_id: raw.id, error: err?.message });
      }
    }
    await recordRunEnd(runId, "ok", new Date().toISOString(), processed, errors);
  } catch (err: any) {
    await recordRunEnd(runId, "error", new Date().toISOString(), processed, errors);
    console.error(err);
    throw err;
  } finally {
    await closeClient();
  }
}

main().catch(() => process.exit(1));


