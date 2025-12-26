export type RawRecord = {
  id: number;
  fuente: string | null;
  fetched_at: string | null;
  url: string | null;
  payload_raw: string | null;
  checksum: string | null;
};

export type NormalizedRecord = {
  url: string;
  identificador: string;
  tipo_subasta: string;
  estado: string | null;
  estado_detalle: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  valor_subasta: string | null;
  precio_salida: string | null;
  tasacion: string | null;
  importe_deposito: string | null;
  organismo: string | null;
  provincia: string | null;
  municipio: string | null;
  checksum: string;
};

export type NormalizationRun = {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  status: "ok" | "error";
  processed: number;
  errors: number;
};

export enum EstadoNormalizado {
  ACTIVE = "ACTIVE",
  UPCOMING = "UPCOMING",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
  UNKNOWN = "UNKNOWN"
}


