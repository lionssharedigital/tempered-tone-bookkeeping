import Papa from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsvText(text: string): ParsedCsv {
  const result = Papa.parse<string[]>(text.trim(), {
    skipEmptyLines: true,
  });
  const [headers, ...rows] = result.data;
  return { headers: headers ?? [], rows };
}

/** Parses a bank-style signed amount string ("+180.00", "-$42.50", "1,234.56") into integer cents. */
export function parseAmountToCents(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const value = Number(cleaned);
  if (Number.isNaN(value)) {
    throw new Error(`Could not parse amount: "${raw}"`);
  }
  return Math.round(value * 100);
}

/** Parses common bank date formats (MM/DD/YYYY, YYYY-MM-DD) into ISO 'YYYY-MM-DD'. */
export function parseDateToIso(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Could not parse date: "${raw}"`);
  }
  return parsed.toISOString().slice(0, 10);
}
