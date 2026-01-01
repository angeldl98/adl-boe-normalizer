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
