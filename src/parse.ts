import type { RawRecord, NormalizedRecord } from "./types";

export function parseRawToNormalized(raw: RawRecord): NormalizedRecord {
  // Placeholder: will parse HTML payload_raw into structured fields.
  return {
    raw_id: raw.id,
    boe_uid: null,
    titulo: null,
    estado: null,
    fecha_publicacion: null,
    fecha_conclusion: null,
    organismo: null,
    provincia: null,
    municipio: null,
    direccion: null,
    importe_base: null,
    url_detalle: null
  };
}


