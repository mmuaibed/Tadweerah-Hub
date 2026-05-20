/**
 * Minimal safe CSV builder.
 *
 * - UTF-8 BOM prepended for Excel Arabic compatibility (Excel needs BOM
 *   on open to correctly interpret UTF-8 characters).
 * - CSV injection mitigation: cells that start with =, +, -, @, tab, or CR
 *   are prefixed with a single-quote so spreadsheet apps treat them as text.
 * - All cells are double-quoted; internal double-quotes are escaped by doubling.
 * - Line endings: CRLF (\r\n) as per RFC 4180.
 */

export function escapeCell(val: string | number | null | undefined): string {
  const str = val == null ? "" : String(val);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const BOM = "\uFEFF";
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((r) => r.map(escapeCell).join(",")),
  ];
  return BOM + lines.join("\r\n");
}
