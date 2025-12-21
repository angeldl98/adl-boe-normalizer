import { getClient } from "./db";
import type { RawRecord } from "./types";

export async function loadRawPending(limit = 100): Promise<RawRecord[]> {
  const client = await getClient();
  const res = await client.query<RawRecord>(
    `
      SELECT id, fuente, fetched_at, url, payload_raw, checksum
      FROM boe_subastas_raw
      WHERE id NOT IN (SELECT raw_id FROM boe_subastas)
      ORDER BY id ASC
      LIMIT $1
    `,
    [limit]
  );
  return res.rows;
}


