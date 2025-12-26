import { EstadoNormalizado } from "./types";
import type { RawRecord, NormalizedRecord } from "./types";

function extractRegex(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  if (!m) return null;
  const val = m[1]?.trim();
  return val || null;
}

function deriveCanonicalUrl(rawUrl: string | null, html: string): string | null {
  const canonical = extractRegex(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (canonical) return canonical;
  if (rawUrl && rawUrl.trim()) return rawUrl.trim();
  return null;
}

function deriveBoeUid(url: string | null, html: string): string | null {
  const byHtml = extractRegex(html, /(SUB-[A-Z0-9\-]+)/i);
  if (byHtml) return byHtml;
  if (!url) return null;
  try {
    const u = new URL(url);
    const matchPath = u.pathname.match(/(SUB-[A-Z0-9\-]+)/i);
    if (matchPath) return matchPath[1];
    const qsId = u.searchParams.get("id") || u.searchParams.get("idSub");
    if (qsId) return qsId;
  } catch {
    // ignore
  }
  return null;
}

function normalizeAmount(val: string | null): string | null {
  if (!val) return null;
  const cleaned = val.replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  return cleaned.trim() ? cleaned.trim() : null;
}

function extractIsoDate(label: "inicio" | "conclusion", html: string): string | null {
  const regex =
    label === "inicio"
      ? /Fecha\s+de\s+inicio[^()]*\(ISO:\s*([^)]+)\)/i
      : /Fecha\s+de\s+(?:conclus[ií]on|conclusi[oó]n)[^()]*\(ISO:\s*([^)]+)\)/i;
  return extractRegex(html, regex);
}

function extractDateFallback(label: "inicio" | "conclusion", html: string): string | null {
  const regex =
    label === "inicio"
      ? /Fecha\s+de\s+inicio[^<\n\r]*?([0-9]{2})-([0-9]{2})-([0-9]{4})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/i
      : /Fecha\s+de\s+(?:conclus[ií]on|conclusi[oó]n)[^<\n\r]*?([0-9]{2})-([0-9]{2})-([0-9]{4})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/i;
  const m = html.match(regex);
  if (!m) return null;
  const [, dd, mm, yyyy, time] = m;
  return `${yyyy}-${mm}-${dd}T${time}+01:00`;
}

function normalizeEstado(estado: string | null): EstadoNormalizado | null {
  if (!estado) return null;
  const low = estado.toLowerCase();
  if (low.includes("cancel") || low.includes("suspend")) return EstadoNormalizado.CANCELLED;
  if (low.includes("finaliz") || low.includes("conclu")) return EstadoNormalizado.CLOSED;
  if (low.includes("prox") || low.includes("apertura")) return EstadoNormalizado.UPCOMING;
  if (low.includes("celebr") || low.includes("activa") || low.includes("puja")) return EstadoNormalizado.ACTIVE;
  return EstadoNormalizado.UNKNOWN;
}

export function parseRawToNormalized(raw: RawRecord): NormalizedRecord {
  const html = raw.payload_raw || "";
  const canonicalUrl = deriveCanonicalUrl(raw.url, html) || raw.url || "";
  const boeUid = deriveBoeUid(canonicalUrl, html) || `RAW-${raw.id}`;
  const estado = extractRegex(html, /Estado:\s*([^<\[\n\r]+)/i);
  const valorSubasta = normalizeAmount(
    extractRegex(html, /Importe\s+Subasta:\s*([\d\.\,]+)/i) ||
      extractRegex(html, /Importe\s+Base:\s*([\d\.\,]+)/i) ||
      extractRegex(html, /Tipo\s+de\s+subasta[^<\n\r]*?([\d\.\,]+)\s*€/i) ||
      extractRegex(html, /Valor\s+subasta:\s*([\d\.\,]+)/i)
  );
  const tipoSubasta = extractRegex(html, /Tipo\s+de\s+subasta:\s*([^<\n\r]+)/i) || "desconocido";
  const organismo = extractRegex(html, /(Órgano\s+Gestor|Organo\s+Gestor):\s*([^<\n\r]+)/i) || extractRegex(html, /Organismo:\s*([^<\n\r]+)/i);
  const provincia = extractRegex(html, /Provincia:\s*([^<\n\r]+)/i);
  const municipio = extractRegex(html, /Municipio:\s*([^<\n\r]+)/i);
  const fechaInicioIso = extractIsoDate("inicio", html) || extractDateFallback("inicio", html);
  const fechaFinIso = extractIsoDate("conclusion", html) || extractDateFallback("conclusion", html);

  return {
    url: canonicalUrl,
    identificador: boeUid,
    tipo_subasta: tipoSubasta,
    estado,
    estado_detalle: null,
    fecha_inicio: fechaInicioIso,
    fecha_fin: fechaFinIso,
    valor_subasta: valorSubasta,
    precio_salida: valorSubasta,
    tasacion: null,
    importe_deposito: null,
    organismo,
    provincia,
    municipio,
    checksum: raw.checksum || ""
  };
}
