import { getClient } from "./db";
import type { RawRecord } from "./types";

export async function loadRawPending(limit = 20): Promise<RawRecord[]> {
  const client = await getClient();
  const res = await client.query<RawRecord>(
    `
      WITH pending AS (
        SELECT
          r.id,
          r.fuente,
          r.fetched_at,
          r.url,
          r.payload_raw,
          r.checksum,
          (regexp_match(r.payload_raw, '(SUB-[A-Z0-9-]+)'))[1] AS ident_guess
        FROM boe_subastas_raw r
        WHERE r.fuente = 'BOE_DETAIL'
      )
      SELECT id, fuente, fetched_at, url, payload_raw, checksum
      FROM pending p
      WHERE p.ident_guess IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM boe_subastas s WHERE s.identificador = p.ident_guess
        )
      ORDER BY p.id ASC
      LIMIT $1
    `,
    [limit]
  );
  return res.rows;
}


