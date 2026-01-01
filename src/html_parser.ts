import type { NormalizedHtmlRecord, RawRecord } from "./types";

const VERSION = 1;

function cleanHtml(html: string): string {
  return html.replace(/&nbsp;/g, " ");
}

function extractTableValue(html: string, label: string): string | null {
  const pattern = new RegExp(
    `<th[^>]*>\\s*${label}\\s*<\\/th>\\s*<td[^>]*>\\s*(?:<strong[^>]*>)?\\s*([^<]+)`,
    "i"
  );
  const m = html.match(pattern);
  if (m?.[1]) return m[1].trim() || null;
  return null;
}

function extractText(patterns: RegExp[], html: string): string | null {
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1].trim() || null;
  }
  return null;
}

function normalizeMoney(value: string | null): string | null {
  if (!value) return null;
  // Remove spaces, keep digits, dots, commas, minus
  const trimmed = value.replace(/\s+/g, "");
  // Drop thousand separators (dot) when followed by exactly 3 digits
  const noThousands = trimmed.replace(/\.(?=\d{3}(\D|$))/g, "");
  // Normalize decimal comma to dot
  const normalized = noThousands.replace(/,/g, ".");
  const cleaned = normalized.replace(/[^\d.-]/g, "").trim();
  if (!cleaned) return null;
  // Ensure only one decimal dot (keep first)
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    const [first, ...rest] = parts;
    return `${first}.${rest.join("")}`;
  }
  return cleaned;
}

function normalizeAuctionType(raw: string | null): string | null {
  if (!raw) return null;
  const low = raw.toLowerCase();
  if (low.includes("judicial")) return "judicial";
  if (low.includes("notarial")) return "notarial";
  if (low.includes("aeat") || low.includes("tribut")) return "aeat";
  if (low.includes("tgss") || low.includes("seguridad social")) return "tgss";
  if (low.includes("administr")) return "administrative";
  return raw.trim() || null;
}

function normalizeStatus(html: string): string | null {
  const flat = html.toLowerCase();
  if (flat.includes("ha concluido")) return "closed";
  if (flat.includes("pendiente de finalización") || flat.includes("pendiente de finalizacion")) return "pending_closure";
  if (flat.includes("celebr")) return "active";
  if (flat.includes("cancel")) return "cancelled";
  return null;
}

function extractIsoDate(html: string, label: "inicio" | "conclusion"): string | null {
  const isoPattern =
    label === "inicio"
      ? /Fecha\s+de\s+inicio[\s\S]{0,160}?ISO:\s*([^)]+)/i
      : /Fecha\s+de\s+(?:conclusi[oó]n|conclusión)[\s\S]{0,160}?ISO:\s*([^)]+)/i;
  const iso = extractText([isoPattern], html);
  if (iso) return iso;

  const fallbackPatterns =
    label === "inicio"
      ? [
          /Fecha\s+de\s+inicio[\s\S]{0,160}?([0-9]{2})[-\/]([0-9]{2})[-\/]([0-9]{4})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/i,
          /Fecha\s+de\s+inicio[\s\S]{0,160}?([0-9]{2})[-\/]([0-9]{2})[-\/]([0-9]{4})/i
        ]
      : [
          /Fecha\s+de\s+(?:conclusi[oó]n|conclusión)[\s\S]{0,160}?([0-9]{2})[-\/]([0-9]{2})[-\/]([0-9]{4})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/i,
          /Fecha\s+de\s+(?:conclusi[oó]n|conclusión)[\s\S]{0,160}?([0-9]{2})[-\/]([0-9]{2})[-\/]([0-9]{4})/i
        ];

  for (const p of fallbackPatterns) {
    const m = html.match(p);
    if (m) {
      const [, dd, mm, yyyy, time] = m;
      if (time) {
        return `${yyyy}-${mm}-${dd}T${time}+01:00`;
      }
      return `${yyyy}-${mm}-${dd}T00:00:00+01:00`;
    }
  }
  return null;
}

function firstMoney(html: string, labels: string[]): string | null {
  for (const label of labels) {
    const val = extractTableValue(html, label);
    const normalized = normalizeMoney(val);
    if (normalized) return normalized;
  }
  return null;
}

export function parseHtmlRecord(raw: RawRecord): NormalizedHtmlRecord {
  const html = cleanHtml(raw.payload_raw || "");
  const auctionTypeRaw = extractTableValue(html, "Tipo de subasta");
  const issuing =
    extractTableValue(html, "Autoridad gestora") ||
    extractTableValue(html, "Órgano Gestor") ||
    extractTableValue(html, "Organo Gestor") ||
    extractTableValue(html, "Organismo");
  const province = extractTableValue(html, "Provincia");
  const municipality = extractTableValue(html, "Municipio");
  const auctionStatus = extractTableValue(html, "Estado") || normalizeStatus(html);
  const startDate = extractIsoDate(html, "inicio");
  const endDate = extractIsoDate(html, "conclusion");

  const startingPrice =
    firstMoney(html, ["Valor subasta", "Importe Subasta", "Importe Base", "Precio de salida"]) ||
    normalizeMoney(extractText([/valor\s+subasta[:\s]*([\d\.\,]+)/i], html));
  const depositAmount =
    firstMoney(html, ["Importe del depósito", "Importe del deposito", "Depósito"]) ||
    normalizeMoney(extractText([/dep[oó]sito[:\s]*([\d\.\,]+)/i], html));

  return {
    boe_subasta_raw_id: raw.id,
    auction_type: normalizeAuctionType(auctionTypeRaw),
    issuing_authority: issuing || null,
    province: province || null,
    municipality: municipality || null,
    auction_status: auctionStatus || null,
    start_date: startDate,
    end_date: endDate,
    starting_price: startingPrice,
    deposit_amount: depositAmount,
    normalization_version: VERSION
  };
}


