# BOE Normalization – Fase 1 (solo HTML almacenado)

Objetivo: transformar `boe_subastas_raw` (HTML detalle) en `boe_subastas_norm` sin re-scraping, sin PDFs, idempotente y reejecutable.

## Campos normalizados
- `auction_type`: de `<th>Tipo de subasta</th>` → mapeo a `judicial|notarial|aeat|tgss|administrative` por texto; si no, valor literal.
- `issuing_authority`: `Autoridad gestora` / `Órgano Gestor` / `Organismo`.
- `province`: `Provincia`.
- `municipality`: `Municipio`.
- `auction_status`: `Estado` si existe; si no, heurística en texto general (`ha concluido`, `celebración`, `cancel`).
- `start_date`: ISO en fila `Fecha de inicio (...) (ISO: ...)`; fallback DD-MM-YYYY HH:MM:SS +01:00.
- `end_date`: igual para conclusión.
- `starting_price`: primero `Valor subasta`, luego `Importe Subasta`, `Importe Base`, `Precio de salida`; se normaliza a número (puntos fuera, coma→punto).
- `deposit_amount`: `Importe del depósito` / `Depósito`; normalización monetaria.
- `normalization_version`: 1; `normalized_at` se actualiza en cada ejecución.

## Suposiciones y casos límite
- El HTML de detalle contiene filas `<th>/<td>`; si un campo no está presente queda `NULL` y el proceso no falla.
- `auction_status` se degrada a `closed` si el texto global contiene “ha concluido”, a `active` si contiene “celebr”, a `cancelled` si contiene “cancel”.
- Horario: si no hay ISO, se asume CET (`+01:00`) al convertir DD-MM-YYYY HH:MM:SS.
- Idempotencia: `ON CONFLICT (boe_subasta_raw_id)` actualiza valores y `normalized_at`.

## Tabla creada
`public.boe_subastas_norm` con PK `id`, FK única `boe_subasta_raw_id`, índices en `province`, `auction_status`, `start_date`, `end_date`.

## Ejecución (único camino)
```
npm install
npm run build
node dist/main.js
```
El script lee **todos** los registros de `boe_subastas_raw`, parsea y hace UPSERT en `boe_subastas_norm`, imprimiendo métricas de cobertura por campo.

## Consultas de ejemplo
- Cobertura por estado y provincia:
```sql
SELECT auction_status, province, count(*) FROM boe_subastas_norm GROUP BY 1,2 ORDER BY 1,2;
```
- Rango temporal:
```sql
SELECT count(*) FROM boe_subastas_norm WHERE start_date >= now() - interval '90 days';
```
- Depósitos y precios no nulos:
```sql
SELECT count(*) FILTER (WHERE starting_price IS NOT NULL) AS with_price,
       count(*) FILTER (WHERE deposit_amount IS NOT NULL) AS with_deposit
FROM boe_subastas_norm;
```

