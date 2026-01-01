"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRawPending = loadRawPending;
const db_1 = require("./db");
async function loadRawPending(limit = 20) {
    const client = await (0, db_1.getClient)();
    const res = await client.query(`
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
        AND p.payload_raw ~* 'Fecha\\s+de\\s+(inicio|conclusi[óo]n)'
        AND p.payload_raw ~* '(Importe\\s+Subasta|Importe\\s+Base|Valor\\s+subasta)'
        AND NOT EXISTS (
          SELECT 1 FROM boe_subastas s WHERE s.identificador = p.ident_guess
        )
      ORDER BY p.id ASC
      LIMIT $1
    `, [limit]);
    return res.rows;
}
