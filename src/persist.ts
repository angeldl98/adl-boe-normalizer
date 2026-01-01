import { getClient } from "./db";
import type { NormalizedHtmlRecord } from "./types";

export async function upsertNormalizedHtml(
  rec: NormalizedHtmlRecord
): Promise<"inserted" | "updated" | "unchanged"> {
  const client = await getClient();
  // IDEMPOTENT UPSERT: La cláusula WHERE garantiza que UPDATE solo ocurre
  // cuando al menos un campo normalizado ha cambiado (usando IS DISTINCT FROM).
  // normalized_at solo se actualiza en cambios reales.
  // Segunda ejecución con misma entrada → inserted=0, updated=0.
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
      WHERE
        boe_subastas_norm.auction_type IS DISTINCT FROM EXCLUDED.auction_type OR
        boe_subastas_norm.auction_status IS DISTINCT FROM EXCLUDED.auction_status OR
        boe_subastas_norm.start_date IS DISTINCT FROM EXCLUDED.start_date OR
        boe_subastas_norm.end_date IS DISTINCT FROM EXCLUDED.end_date OR
        boe_subastas_norm.starting_price IS DISTINCT FROM EXCLUDED.starting_price OR
        boe_subastas_norm.deposit_amount IS DISTINCT FROM EXCLUDED.deposit_amount OR
        boe_subastas_norm.issuing_authority IS DISTINCT FROM EXCLUDED.issuing_authority OR
        boe_subastas_norm.province IS DISTINCT FROM EXCLUDED.province OR
        boe_subastas_norm.municipality IS DISTINCT FROM EXCLUDED.municipality OR
        boe_subastas_norm.normalization_version IS DISTINCT FROM EXCLUDED.normalization_version
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

  if (res.rowCount === 0) return "unchanged";
  const inserted = res.rows[0]?.inserted;
  return inserted ? "inserted" : "updated";
}

