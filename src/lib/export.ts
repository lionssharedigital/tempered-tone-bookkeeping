import ExcelJS from "exceljs";

export type ExportFormat = "csv" | "xlsx";

export type ExportCell = string | number | null;

export interface ExportSection {
  /** A bold section/group label row spanning all columns, e.g. "INCOME". */
  heading?: string;
  rows: ExportCell[][];
}

/** Builds one flat CSV string from a header row plus one or more row groups. */
export function buildCsv(headers: string[], sections: ExportSection[]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const section of sections) {
    if (section.heading) lines.push(csvEscape(section.heading));
    for (const row of section.rows) {
      lines.push(row.map((cell) => csvEscape(cell)).join(","));
    }
  }
  return lines.join("\r\n");
}

function csvEscape(value: ExportCell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds an .xlsx workbook buffer from a header row plus one or more row groups. */
export async function buildXlsx(
  sheetName: string,
  headers: string[],
  sections: ExportSection[],
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers).font = { bold: true };
  for (const section of sections) {
    if (section.heading) {
      const row = sheet.addRow([section.heading]);
      row.font = { bold: true };
    }
    for (const row of section.rows) {
      sheet.addRow(row);
    }
  }
  sheet.columns.forEach((col) => {
    let maxLen = 8;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 40);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

/**
 * TypeScript's DOM lib types Uint8Array's BodyInit compatibility around a
 * concrete `ArrayBuffer` generic parameter, which a plain `string | Uint8Array`
 * union doesn't structurally satisfy even though it's valid at runtime.
 */
export function toResponseBody(body: string | Uint8Array): BodyInit {
  return body as BodyInit;
}

export function exportContentType(format: ExportFormat): string {
  return format === "xlsx"
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "text/csv; charset=utf-8";
}

export function exportFilename(base: string, format: ExportFormat): string {
  return `${base}.${format}`;
}
