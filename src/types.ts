export type RawRecord = {
  id: number;
  fuente: string | null;
  fetched_at: string | null;
  url: string | null;
  payload_raw: string | null;
  checksum: string | null;
};

export type NormalizedRecord = {
  raw_id: number;
  boe_uid: string | null;
  titulo: string | null;
  estado: string | null;
  fecha_publicacion: string | null;
  fecha_conclusion: string | null;
  organismo: string | null;
  provincia: string | null;
  municipio: string | null;
  direccion: string | null;
  importe_base: string | null;
  url_detalle: string | null;
};

export type NormalizationRun = {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  status: "ok" | "error";
  processed: number;
  errors: number;
};


