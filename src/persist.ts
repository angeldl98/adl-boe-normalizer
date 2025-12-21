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
      INSERT INTO boe_subastas (raw_id, boe_uid, titulo, estado, fecha_publicacion, fecha_conclusion, organismo, provincia, municipio, direccion, importe_base, url_detalle, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(), now())
      ON CONFLICT (raw_id) DO UPDATE SET
        boe_uid = EXCLUDED.boe_uid,
        titulo = EXCLUDED.titulo,
        estado = EXCLUDED.estado,
        fecha_publicacion = EXCLUDED.fecha_publicacion,
        fecha_conclusion = EXCLUDED.fecha_conclusion,
        organismo = EXCLUDED.organismo,
        provincia = EXCLUDED.provincia,
        municipio = EXCLUDED.municipio,
        direccion = EXCLUDED.direccion,
        importe_base = EXCLUDED.importe_base,
        url_detalle = EXCLUDED.url_detalle,
        updated_at = now()
    `,
    [
      rec.raw_id,
      rec.boe_uid,
      rec.titulo,
      rec.estado,
      rec.fecha_publicacion,
      rec.fecha_conclusion,
      rec.organismo,
      rec.provincia,
      rec.municipio,
      rec.direccion,
      rec.importe_base,
      rec.url_detalle
    ]
  );
}


