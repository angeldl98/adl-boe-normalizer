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
  await client.query(
    `
      ALTER TABLE boe_subastas
        ADD COLUMN IF NOT EXISTS fecha_inicio timestamptz,
        ADD COLUMN IF NOT EXISTS fecha_fin timestamptz,
        ADD COLUMN IF NOT EXISTS precio_salida numeric
    `
  );
  await client.query(
    `
      INSERT INTO boe_subastas (
        url,
        identificador,
        tipo_subasta,
        estado,
        estado_detalle,
        fecha_inicio,
        fecha_fin,
        valor_subasta,
        precio_salida,
        tasacion,
        importe_deposito,
        organismo,
        provincia,
        municipio,
        checksum,
        normalized_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())
      ON CONFLICT (identificador) DO UPDATE SET
        url = EXCLUDED.url,
        tipo_subasta = EXCLUDED.tipo_subasta,
        estado = EXCLUDED.estado,
        estado_detalle = EXCLUDED.estado_detalle,
        fecha_inicio = EXCLUDED.fecha_inicio,
        fecha_fin = EXCLUDED.fecha_fin,
        valor_subasta = EXCLUDED.valor_subasta,
        precio_salida = EXCLUDED.precio_salida,
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
      rec.fecha_inicio,
      rec.fecha_fin,
      rec.valor_subasta,
      rec.precio_salida,
      rec.tasacion,
      rec.importe_deposito,
      rec.organismo,
      rec.provincia,
      rec.municipio,
      rec.checksum
    ]
  );
}


