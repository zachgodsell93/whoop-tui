export function msToHours(ms?: number): string {
  if (!ms) return "-";
  return `${(ms / 3_600_000).toFixed(2)}h`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}
