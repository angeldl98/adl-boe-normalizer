import "dotenv/config";
import { closeClient, getClient } from "./db";
import { parseHtmlRecord } from "./html_parser";
import { upsertNormalizedHtml } from "./persist";
import type { CoverageCounters, RawRecord } from "./types";

function initCoverage(total: number): CoverageCounters {
  return {
    total,
    inserted: 0,
    updated: 0,
    degraded: 0,
    recovered: 0,
    fields: {
      auction_type: 0,
      issuing_authority: 0,
      province: 0,
      municipality: 0,
      auction_status: 0,
      start_date: 0,
      end_date: 0,
      starting_price: 0,
      deposit_amount: 0
    }
  };
}

function validationSignals(record: {
  auction_status: string | null;
  start_date: string | null;
  end_date: string | null;
  starting_price: string | null;
}): { count: number; valid: boolean } {
  let count = 0;
  if (record.auction_status) count += 1;
  if (record.start_date || record.end_date) count += 1;
  const priceNum = parseFloat(String(record.starting_price ?? "").replace(",", "."));
  if (Number.isFinite(priceNum)) count += 1;
  return { count, valid: count >= 2 };
}

async function main() {
  const client = await getClient();
  const raws = await client.query<RawRecord>(
    `
      SELECT id, fuente, fetched_at, url, payload_raw, checksum
      FROM boe_subastas_raw
      ORDER BY id ASC
    `
  );

  const coverage = initCoverage(raws.rowCount || 0);
  console.log(`normalization_start count=${raws.rowCount}`);

  for (const row of raws.rows) {
    const parsed = parseHtmlRecord(row);
    const existing = await client.query<{
      auction_status: string | null;
      start_date: string | null;
      end_date: string | null;
      starting_price: string | null;
    }>(
      `
        SELECT auction_status, start_date, end_date, starting_price
        FROM boe_subastas_norm
        WHERE boe_subasta_raw_id = $1
      `,
      [parsed.boe_subasta_raw_id]
    );

    const prevSignals = validationSignals(
      existing.rows[0] || {
        auction_status: null,
        start_date: null,
        end_date: null,
        starting_price: null
      }
    );
    const newSignals = validationSignals(parsed);

    if (!newSignals.valid) {
      coverage.degraded += 1;
      console.warn(
        `[warn] validation_degraded raw_id=${row.id} signals=${newSignals.count} status=${parsed.auction_status || "null"} price=${parsed.starting_price || "null"}`
      );
    } else if (existing.rows.length && !prevSignals.valid && newSignals.valid) {
      coverage.recovered += 1;
      console.log(`[info] validation_recovered raw_id=${row.id} signals=${newSignals.count}`);
    }

    const result = await upsertNormalizedHtml(parsed);
    if (result === "inserted") coverage.inserted += 1;
    else if (result === "updated") coverage.updated += 1;

    if (parsed.auction_type) coverage.fields.auction_type += 1;
    if (parsed.issuing_authority) coverage.fields.issuing_authority += 1;
    if (parsed.province) coverage.fields.province += 1;
    if (parsed.municipality) coverage.fields.municipality += 1;
    if (parsed.auction_status) coverage.fields.auction_status += 1;
    if (parsed.start_date) coverage.fields.start_date += 1;
    if (parsed.end_date) coverage.fields.end_date += 1;
    if (parsed.starting_price) coverage.fields.starting_price += 1;
    if (parsed.deposit_amount) coverage.fields.deposit_amount += 1;
  }

  const total = coverage.total || 1;
  console.log(
    JSON.stringify(
      {
        total,
        inserted: coverage.inserted,
        updated: coverage.updated,
        degraded: coverage.degraded,
        recovered: coverage.recovered,
        coverage: {
          auction_type: `${coverage.fields.auction_type}/${total}`,
          issuing_authority: `${coverage.fields.issuing_authority}/${total}`,
          province: `${coverage.fields.province}/${total}`,
          municipality: `${coverage.fields.municipality}/${total}`,
          auction_status: `${coverage.fields.auction_status}/${total}`,
          start_date: `${coverage.fields.start_date}/${total}`,
          end_date: `${coverage.fields.end_date}/${total}`,
          starting_price: `${coverage.fields.starting_price}/${total}`,
          deposit_amount: `${coverage.fields.deposit_amount}/${total}`
        }
      },
      null,
      2
    )
  );

  await closeClient();
}

main().catch((err) => {
  console.error(err);
  return closeClient().finally(() => process.exit(1));
});
