import { getClient } from "./db";
import type { NormalizedHtmlRecord } from "./types";

export async function upsertNormalizedHtml(rec: NormalizedHtmlRecord): Promise<"inserted" | "updated"> {
  const client = await getClient();
  const res = await client.query<{ inserted: boolean }>(
    `
      INSERT INTO boe_subastas_norm (
        boe_subasta_raw_id,
        auction_type,
        issuing_authority,
        province,
        municipality,
        auction_status,
        start_date,
        end_date,
        starting_price,
        deposit_amount,
        normalization_version,
        normalized_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
      ON CONFLICT (boe_subasta_raw_id) DO UPDATE SET
        auction_type = EXCLUDED.auction_type,
        issuing_authority = EXCLUDED.issuing_authority,
        province = EXCLUDED.province,
        municipality = EXCLUDED.municipality,
        auction_status = EXCLUDED.auction_status,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        starting_price = EXCLUDED.starting_price,
        deposit_amount = EXCLUDED.deposit_amount,
        normalization_version = EXCLUDED.normalization_version,
        normalized_at = now()
      RETURNING (xmax = 0) AS inserted
    `,
    [
      rec.boe_subasta_raw_id,
      rec.auction_type,
      rec.issuing_authority,
      rec.province,
      rec.municipality,
      rec.auction_status,
      rec.start_date,
      rec.end_date,
      rec.starting_price,
      rec.deposit_amount,
      rec.normalization_version
    ]
  );
  const inserted = res.rows[0]?.inserted;
  return inserted ? "inserted" : "updated";
}

