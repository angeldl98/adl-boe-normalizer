# adl-boe-normalizer

Servicio de normalización (CAPA 2) para convertir datos **RAW** del BOE en estructuras tabulares. Principios inmutables:

- Nunca scrapea ni accede al BOE.
- Nunca usa HTTP ni navegadores.
- Solo lee desde base de datos (`boe_subastas_raw`) y transforma a tablas estructuradas (`boe_subastas`, `boe_normalization_runs`).
- Sin colas, sin reintentos automáticos, sin crawling.
- Seguridad IP garantizada por diseño: no hay tráfico externo.
- GitHub es la única fuente de verdad (config y código).

Estructura:
- `src/main.ts`: punto de entrada.
- `src/db.ts`: conexión PG (dotenv, fail-fast).
- `src/load_raw.ts`: carga de RAW pendientes de normalizar.
- `src/parse.ts`: parsing puro (HTML → campos).
- `src/persist.ts`: upserts transaccionales.
- `src/types.ts`: tipos compartidos.

Uso (local):
1) `npm install`
2) Configurar `.env` con `DATABASE_URL` (o variables PG*).
3) `npm run build`
4) `npm start` (no realiza scraping; solo transforma).

Docker: la imagen es solo de runtime y asume `dist/` precompilado.

