export type RawRecord = {
  id: number;
  fuente: string | null;
  fetched_at: string | null;
  url: string | null;
  payload_raw: string | null;
  checksum: string | null;
};

export type NormalizedHtmlRecord = {
  boe_subasta_raw_id: number;
  auction_type: string | null;
  issuing_authority: string | null;
  province: string | null;
  municipality: string | null;
  auction_status: string | null;
  start_date: string | null;
  end_date: string | null;
  starting_price: string | null;
  deposit_amount: string | null;
  normalization_version: number;
};

export type CoverageCounters = {
  total: number;
  inserted: number;
  updated: number;
  fields: {
    auction_type: number;
    issuing_authority: number;
    province: number;
    municipality: number;
    auction_status: number;
    start_date: number;
    end_date: number;
    starting_price: number;
    deposit_amount: number;
  };
};

// Compatibilidad con código previo (no usado en fase actual de normalización de HTML)
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

export enum EstadoNormalizado {
  ACTIVE = "ACTIVE",
  UPCOMING = "UPCOMING",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
  UNKNOWN = "UNKNOWN"
}


