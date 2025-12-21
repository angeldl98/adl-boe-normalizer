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

export function parseRawToNormalized(raw: RawRecord): NormalizedRecord {
  const html = raw.payload_raw || "";
  const canonicalUrl = deriveCanonicalUrl(raw.url, html);
  const boeUid = deriveBoeUid(canonicalUrl, html);
  const titulo = extractRegex(html, /<title>([^<]+)<\/title>/i) || extractRegex(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const estado = extractRegex(html, /Estado:\s*([^<\[\n\r]+)/i);
  const fechaPublicacion =
    extractRegex(html, /Publicaci[oó]n:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i) ||
    extractRegex(html, /Fecha\s+de\s+publicaci[oó]n[^0-9]*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);

  return {
    raw_id: raw.id,
    boe_uid: boeUid,
    titulo,
    estado,
    fecha_publicacion: fechaPublicacion,
    fecha_conclusion: null,
    organismo: null,
    provincia: null,
    municipio: null,
    direccion: null,
    importe_base: null,
    url_detalle: canonicalUrl
  };
}


