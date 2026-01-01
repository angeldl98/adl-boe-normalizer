import "dotenv/config";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { closeClient, getClient } from "./db";
import { loadRawPending } from "./load_raw";
import { parseRawToNormalized } from "./parse";
import { recordRunStart, recordRunEnd, upsertNormalized } from "./persist";

// pdf-parse no expone tipos; usamos require para mantener compatibilidad estricta
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text?: string }>;

function normalizeAmount(val: string | null): string | null {
  if (!val) return null;
  const cleaned = val.replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  return cleaned.trim() ? cleaned.trim() : null;
}

function extractValorFromText(text: string | undefined): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ");
  const patterns = [
    /valor\s+subasta[:\s]*([\d\.\,]+)/i,
    /importe\s+de\s+subasta[:\s]*([\d\.\,]+)/i,
    /importe\s+subasta[:\s]*([\d\.\,]+)/i,
    /importe\s+base[:\s]*([\d\.\,]+)/i,
    /tipo\s+de\s+subasta[:\s]*([\d\.\,]+)/i
  ];
  for (const p of patterns) {
    const m = flat.match(p);
    if (m?.[1]) return normalizeAmount(m[1]);
  }
  return null;
}

async function extractValorFromPdf(rawId: number): Promise<string | null> {
  const client = await getClient();
  try {
    const res = await client.query<{ file_path: string }>(
      `
        SELECT file_path
        FROM boe_subastas_pdfs
        WHERE raw_id = $1
        ORDER BY fetched_at DESC
        LIMIT 1
      `,
      [rawId]
    );
    if (res.rowCount === 0) return null;
    const filePath = res.rows[0].file_path;
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    return extractValorFromText(parsed?.text);
  } catch (err: any) {
    console.warn(`pdf_extract_failed raw_id=${rawId} err=${err?.message || err}`);
    return null;
  }
}

async function main() {
  const runId = uuidv4();
  const startedAt = new Date().toISOString();
  let processed = 0;
  let errors = 0;
  let status: "ok" | "success_no_changes" | "error" = "ok";

  const client = await getClient();
  await client.query("BEGIN");

  await recordRunStart({
    run_id: runId,
    started_at: startedAt,
    finished_at: null,
    status: "ok",
    processed: 0,
    errors: 0
  });

  await client.query("SAVEPOINT after_start");

  try {
    const raws = await loadRawPending(20);
    console.log(`normalizer load_raw_pending count=${raws.length}`);
    for (const raw of raws) {
      const normalized = parseRawToNormalized(raw);
      if (!normalized.valor_subasta) {
        const valorPdf = await extractValorFromPdf(raw.id);
        if (valorPdf) {
          normalized.valor_subasta = valorPdf;
          normalized.precio_salida = normalized.precio_salida || valorPdf;
        }
      }
      if (!normalized.fecha_inicio || !normalized.fecha_fin || !normalized.valor_subasta) {
        console.log(
          `normalizer skip_missing_fields ident=${normalized.identificador} fecha_inicio=${normalized.fecha_inicio} fecha_fin=${normalized.fecha_fin} valor_subasta=${normalized.valor_subasta}`
        );
        continue;
      }
      await upsertNormalized(normalized);
      processed += 1;
    }
    status = processed === 0 ? "success_no_changes" : "ok";
    await recordRunEnd(runId, status, new Date().toISOString(), processed, errors);
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK TO SAVEPOINT after_start");
    processed = 0;
    errors = 1;
    status = "error";
    await recordRunEnd(runId, "error", new Date().toISOString(), processed, errors);
    await client.query("COMMIT");
    console.error(err);
    throw err;
  } finally {
    await closeClient();
  }
}

main().catch(() => process.exit(1));
