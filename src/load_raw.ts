import { getClient } from "./db";
import type { RawRecord } from "./types";

export async function loadRawPending(limit = 20): Promise<RawRecord[]> {
  const client = await getClient();
  const res = await client.query<RawRecord>(
    `
      SELECT r.id, r.fuente, r.fetched_at, r.url, r.payload_raw, r.checksum
      FROM boe_subastas_raw r
      WHERE NOT EXISTS (
        SELECT 1 FROM boe_subastas s WHERE s.checksum = r.checksum
      )
      ORDER BY r.id ASC
      LIMIT $1
    `,
    [limit]
  );
  return res.rows;
}


