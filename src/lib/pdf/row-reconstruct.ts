import type { PositionedTextItem } from "./extract-text";

export interface TableRow {
  cells: string[];
  page: number;
}

/**
 * Clusters positioned text items into table rows and columns using
 * y-coordinate proximity (same row) and x-coordinate gaps (column
 * boundaries). This is a generic heuristic, not a bank-specific template.
 */
export function reconstructRows(
  items: PositionedTextItem[],
  { yTolerance = 3, columnGapThreshold = 12 }: { yTolerance?: number; columnGapThreshold?: number } = {},
): TableRow[] {
  const byPage = new Map<number, PositionedTextItem[]>();
  for (const item of items) {
    if (!byPage.has(item.page)) byPage.set(item.page, []);
    byPage.get(item.page)!.push(item);
  }

  const rows: TableRow[] = [];
  for (const [page, pageItems] of byPage) {
    const sorted = [...pageItems].sort((a, b) => a.y - b.y || a.x - b.x);

    const lines: PositionedTextItem[][] = [];
    for (const item of sorted) {
      const line = lines[lines.length - 1];
      const lineY = line ? line[0].y : null;
      if (line && lineY !== null && Math.abs(item.y - lineY) <= yTolerance) {
        line.push(item);
      } else {
        lines.push([item]);
      }
    }

    for (const line of lines) {
      line.sort((a, b) => a.x - b.x);
      const cells: string[] = [];
      let currentCell = "";
      let prevEndX: number | null = null;
      for (const item of line) {
        if (prevEndX !== null && item.x - prevEndX > columnGapThreshold) {
          cells.push(currentCell.trim());
          currentCell = item.text;
        } else {
          currentCell += (currentCell && !currentCell.endsWith(" ") ? " " : "") + item.text;
        }
        prevEndX = item.x + item.width;
      }
      if (currentCell.trim()) cells.push(currentCell.trim());
      if (cells.length) rows.push({ cells, page });
    }
  }
  return rows;
}
