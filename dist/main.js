"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const promises_1 = __importDefault(require("fs/promises"));
const uuid_1 = require("uuid");
const db_1 = require("./db");
const load_raw_1 = require("./load_raw");
const parse_1 = require("./parse");
const persist_1 = require("./persist");
// pdf-parse no expone tipos; usamos require para mantener compatibilidad estricta
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");
function normalizeAmount(val) {
    if (!val)
        return null;
    const cleaned = val.replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
    return cleaned.trim() ? cleaned.trim() : null;
}
function extractValorFromText(text) {
    if (!text)
        return null;
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
        if (m?.[1])
            return normalizeAmount(m[1]);
    }
    return null;
}
async function extractValorFromPdf(rawId) {
    const client = await (0, db_1.getClient)();
    try {
        const res = await client.query(`
        SELECT file_path
        FROM boe_subastas_pdfs
        WHERE raw_id = $1
        ORDER BY fetched_at DESC
        LIMIT 1
      `, [rawId]);
        if (res.rowCount === 0)
            return null;
        const filePath = res.rows[0].file_path;
        const buffer = await promises_1.default.readFile(filePath);
        const parsed = await pdfParse(buffer);
        return extractValorFromText(parsed?.text);
    }
    catch (err) {
        console.warn(`pdf_extract_failed raw_id=${rawId} err=${err?.message || err}`);
        return null;
    }
}
async function main() {
    const runId = (0, uuid_1.v4)();
    const startedAt = new Date().toISOString();
    let processed = 0;
    let errors = 0;
    const client = await (0, db_1.getClient)();
    await client.query("BEGIN");
    await (0, persist_1.recordRunStart)({
        run_id: runId,
        started_at: startedAt,
        finished_at: null,
        status: "ok",
        processed: 0,
        errors: 0
    });
    await client.query("SAVEPOINT after_start");
    try {
        const raws = await (0, load_raw_1.loadRawPending)(20);
        console.log(`normalizer load_raw_pending count=${raws.length}`);
        for (const raw of raws) {
            const normalized = (0, parse_1.parseRawToNormalized)(raw);
            if (!normalized.valor_subasta) {
                const valorPdf = await extractValorFromPdf(raw.id);
                if (valorPdf) {
                    normalized.valor_subasta = valorPdf;
                    normalized.precio_salida = normalized.precio_salida || valorPdf;
                }
            }
            if (!normalized.fecha_inicio || !normalized.fecha_fin || !normalized.valor_subasta) {
                console.log(`normalizer skip_missing_fields ident=${normalized.identificador} fecha_inicio=${normalized.fecha_inicio} fecha_fin=${normalized.fecha_fin} valor_subasta=${normalized.valor_subasta}`);
                continue;
            }
            await (0, persist_1.upsertNormalized)(normalized);
            processed += 1;
        }
        await (0, persist_1.recordRunEnd)(runId, "ok", new Date().toISOString(), processed, errors);
        await client.query("COMMIT");
    }
    catch (err) {
        await client.query("ROLLBACK TO SAVEPOINT after_start");
        processed = 0;
        errors = 1;
        await (0, persist_1.recordRunEnd)(runId, "error", new Date().toISOString(), processed, errors);
        await client.query("COMMIT");
        console.error(err);
        throw err;
    }
    finally {
        await (0, db_1.closeClient)();
    }
}
main().catch(() => process.exit(1));
