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
  const updateRes = await client.query(
    `
      UPDATE boe_subastas
      SET
        url = $2,
        identificador = $3,
        tipo_subasta = $4,
        estado = $5,
        estado_detalle = $6,
        valor_subasta = $7,
        tasacion = $8,
        importe_deposito = $9,
        organismo = $10,
        provincia = $11,
        municipio = $12,
        normalized_at = now()
      WHERE checksum = $1
    `,
    [
      rec.checksum,
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
      rec.municipio
    ]
  );

  if (updateRes.rowCount === 0) {
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
}


