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
      INSERT INTO boe_subastas (raw_id, boe_uid, titulo, estado, fecha_publicacion, fecha_conclusion, expediente, organismo, provincia, municipio, direccion, importe_base, importe_subasta, tipo_subasta, estado_normalizado, url_detalle, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now(), now())
      ON CONFLICT (raw_id) DO UPDATE SET
        boe_uid = COALESCE(EXCLUDED.boe_uid, boe_subastas.boe_uid),
        titulo = COALESCE(EXCLUDED.titulo, boe_subastas.titulo),
        estado = COALESCE(EXCLUDED.estado, boe_subastas.estado),
        fecha_publicacion = COALESCE(EXCLUDED.fecha_publicacion, boe_subastas.fecha_publicacion),
        fecha_conclusion = COALESCE(EXCLUDED.fecha_conclusion, boe_subastas.fecha_conclusion),
        expediente = COALESCE(EXCLUDED.expediente, boe_subastas.expediente),
        organismo = COALESCE(EXCLUDED.organismo, boe_subastas.organismo),
        provincia = COALESCE(EXCLUDED.provincia, boe_subastas.provincia),
        municipio = COALESCE(EXCLUDED.municipio, boe_subastas.municipio),
        direccion = COALESCE(EXCLUDED.direccion, boe_subastas.direccion),
        importe_base = COALESCE(EXCLUDED.importe_base, boe_subastas.importe_base),
        importe_subasta = COALESCE(EXCLUDED.importe_subasta, boe_subastas.importe_subasta),
        tipo_subasta = COALESCE(EXCLUDED.tipo_subasta, boe_subastas.tipo_subasta),
        estado_normalizado = COALESCE(EXCLUDED.estado_normalizado, boe_subastas.estado_normalizado),
        url_detalle = COALESCE(EXCLUDED.url_detalle, boe_subastas.url_detalle),
        updated_at = now()
    `,
    [
      rec.raw_id,
      rec.boe_uid,
      rec.titulo,
      rec.estado,
      rec.fecha_publicacion,
      rec.fecha_conclusion,
      rec.expediente,
      rec.organismo,
      rec.provincia,
      rec.municipio,
      rec.direccion,
      rec.importe_base,
      rec.importe_subasta,
      rec.tipo_subasta,
      rec.estado_normalizado,
      rec.url_detalle
    ]
  );
}


