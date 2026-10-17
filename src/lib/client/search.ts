/** Normaliza texto para busca case-insensitive sem acento. */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function matchesSearch(query: string, ...fields: Array<string | null | undefined>): boolean {
  const needle = normalizeSearch(query);
  if (!needle) return true;

  return fields.some((field) => normalizeSearch(field ?? "").includes(needle));
}
