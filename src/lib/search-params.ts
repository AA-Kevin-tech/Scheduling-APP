/**
 * Next.js App Router may pass `string | string[]` for a query key (duplicate keys).
 * Prisma and string helpers expect a single scalar — use the first value.
 */
export function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
