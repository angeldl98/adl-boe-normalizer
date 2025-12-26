import { getClient } from "./db";
import type { NormalizedRecord, NormalizationRun } from "./types";

export async function recordRunStart(run: NormalizationRun): Promise<void> {
  const client = await getClient();
  await client.query(
    `
      INSERT INTO boe_normalization_runs (run_id, started_at, finished_at, status, processed, errors)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [run.run_id, run.started_at, run.finished_at, run.status, run.processed, run.errors]
  );
}

export async function recordRunEnd(runId: string, status: "ok" | "error", finishedAt: string, processed: number, errors: number): Promise<void> {
  const client = await getClient();
  await client.query(
    `
      UPDATE boe_normalization_runs
      SET status = $2, finished_at = $3, processed = $4, errors = $5
      WHERE run_id = $1
    `,
    [runId, status, finishedAt, processed, errors]
  );
}

export async function upsertNormalized(rec: NormalizedRecord): Promise<void> {
  const client = await getClient();
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS boe_subastas_checksum_uidx ON boe_subastas(checksum)");

  await client.query(
    `
      INSERT INTO boe_subastas (
        url,
        identificador,
        tipo_subasta,
        estado,
        estado_detalle,
        valor_subasta,
        tasacion,
        importe_deposito,
        organismo,
        provincia,
        municipio,
        checksum,
        normalized_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
      ON CONFLICT (checksum) DO UPDATE SET
        url = EXCLUDED.url,
        identificador = EXCLUDED.identificador,
        tipo_subasta = EXCLUDED.tipo_subasta,
        estado = EXCLUDED.estado,
        estado_detalle = EXCLUDED.estado_detalle,
        valor_subasta = EXCLUDED.valor_subasta,
        tasacion = EXCLUDED.tasacion,
        importe_deposito = EXCLUDED.importe_deposito,
        organismo = EXCLUDED.organismo,
        provincia = EXCLUDED.provincia,
        municipio = EXCLUDED.municipio,
        checksum = EXCLUDED.checksum,
        normalized_at = now()
    `,
    [
      rec.url,
      rec.identificador,
      rec.tipo_subasta,
      rec.estado,
      rec.estado_detalle,
      rec.valor_subasta,
      rec.tasacion,
      rec.importe_deposito,
      rec.organismo,
      rec.provincia,
      rec.municipio,
      rec.checksum
    ]
  );
}


