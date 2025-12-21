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
  const canonicalUrl = deriveCanonicalUrl(raw.url, html);
  const boeUid = deriveBoeUid(canonicalUrl, html);
  const titulo = extractRegex(html, /<title>([^<]+)<\/title>/i) || extractRegex(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const estado = extractRegex(html, /Estado:\s*([^<\[\n\r]+)/i);
  const fechaPublicacion =
    extractRegex(html, /Publicaci[oó]n:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i) ||
    extractRegex(html, /Fecha\s+de\s+publicaci[oó]n[^0-9]*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
  const fechaConclusion = extractRegex(html, /Conclusi[oó]n\s+prevista:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
  const expediente = extractRegex(html, /Expediente:\s*([^<\n\r]+)/i);
  const organismo = extractRegex(html, /(Órgano\s+Gestor|Organo\s+Gestor):\s*([^<\n\r]+)/i) || extractRegex(html, /Organismo:\s*([^<\n\r]+)/i);
  const provincia = extractRegex(html, /Provincia:\s*([^<\n\r]+)/i);
  const municipio = extractRegex(html, /Municipio:\s*([^<\n\r]+)/i);
  const direccion = extractRegex(html, /Direcci[oó]n:\s*([^<\n\r]+)/i);
  const importeBase = normalizeAmount(
    extractRegex(html, /Importe\s+Base:\s*([\d\.\,]+)/i) || extractRegex(html, /Tipo\s+de\s+subasta[^<\n\r]*?([\d\.\,]+)\s*€/i)
  );
  const importeSubasta = normalizeAmount(extractRegex(html, /Importe\s+Subasta:\s*([\d\.\,]+)/i));
  const tipoSubasta = extractRegex(html, /Tipo\s+de\s+subasta:\s*([^<\n\r]+)/i);
  const estadoNormalizado = normalizeEstado(estado);

  return {
    raw_id: raw.id,
    boe_uid: boeUid,
    titulo,
    estado,
    fecha_publicacion: fechaPublicacion,
    fecha_conclusion: fechaConclusion,
    expediente,
    organismo,
    provincia,
    municipio,
    direccion,
    importe_base: importeBase,
    importe_subasta: importeSubasta,
    tipo_subasta: tipoSubasta,
    estado_normalizado: estadoNormalizado,
    url_detalle: canonicalUrl
  };
}
