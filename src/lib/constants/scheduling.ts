/** Minimum rest between shifts (minutes). Configurable later via env or DB. */
export const DEFAULT_MIN_REST_MINUTES = Number(
  process.env.MIN_REST_MINUTES ?? 480,
);
