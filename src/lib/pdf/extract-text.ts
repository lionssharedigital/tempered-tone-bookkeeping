export interface PositionedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  page: number;
}

/**
 * Extracts text items with page coordinates from a PDF buffer using
 * pdfjs-dist's legacy (Node-compatible) build. Coordinates let us
 * reconstruct table rows/columns downstream, which plain linear text
 * extraction would scramble.
 */
export async function extractPositionedText(buffer: Buffer): Promise<PositionedTextItem[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const items: PositionedTextItem[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    for (const raw of content.items) {
      if (!("str" in raw) || !raw.str.trim()) continue;
      const item = raw as { str: string; transform: number[]; width: number };
      const x = item.transform[4];
      // PDF y-coordinates increase upward; flip so rows read top-to-bottom.
      const y = viewport.height - item.transform[5];
      items.push({ text: item.str, x, y, width: item.width, page: pageNum });
    }
  }
  return items;
}
