import type { TableRow } from "./row-reconstruct";

const DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^[+-]?\$?\(?-?[\d,]+\.\d{2}\)?$/;

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
}

function looksLikeDate(cell: string): boolean {
  return DATE_PATTERN.test(cell.trim());
}
function looksLikeAmount(cell: string): boolean {
  return AMOUNT_PATTERN.test(cell.trim());
}

function mostCommon(counts: number[]): number {
  const freq = new Map<number, number>();
  for (const c of counts) freq.set(c, (freq.get(c) ?? 0) + 1);
  let best = counts[0] ?? 0;
  let bestCount = 0;
  for (const [count, freqCount] of freq) {
    if (freqCount > bestCount) {
      best = count;
      bestCount = freqCount;
    }
  }
  return best;
}

/**
 * Heuristically brackets the transaction table within a PDF's reconstructed
 * rows: a "data row" is one containing at least one date-shaped cell and one
 * amount-shaped cell. The row immediately preceding the first data row (if
 * it has a compatible column count and isn't itself data) is used as the
 * header. No bank-specific template is assumed.
 */
export function extractTransactionTable(rows: TableRow[]): ExtractedTable {
  const dataRowIndices: number[] = [];
  rows.forEach((row, i) => {
    if (row.cells.some(looksLikeDate) && row.cells.some(looksLikeAmount)) {
      dataRowIndices.push(i);
    }
  });

  if (dataRowIndices.length === 0) {
    return { headers: [], rows: [] };
  }

  const targetColumnCount = mostCommon(dataRowIndices.map((i) => rows[i].cells.length));

  const dataRows = dataRowIndices
    .filter((i) => rows[i].cells.length === targetColumnCount)
    .map((i) => rows[i].cells);

  const firstDataIndex = dataRowIndices[0];
  const candidateHeaderRow = firstDataIndex > 0 ? rows[firstDataIndex - 1] : null;
  const headerLooksLikeData =
    candidateHeaderRow &&
    (candidateHeaderRow.cells.some(looksLikeDate) || candidateHeaderRow.cells.some(looksLikeAmount));

  const headers =
    candidateHeaderRow &&
    !headerLooksLikeData &&
    candidateHeaderRow.cells.length === targetColumnCount
      ? candidateHeaderRow.cells
      : Array.from({ length: targetColumnCount }, (_, i) => `Column ${i + 1}`);

  return { headers, rows: dataRows };
}
