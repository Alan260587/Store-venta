/**
 * Fast, non-blocking PDF page counter that scans PDF header/trailer slices.
 * Processes multiple PDFs in milliseconds and never hangs or throws.
 */
export async function countPdfPages(file: File): Promise<{ pagesCount: number; fileSizeFormatted: string }> {
  const sizeNum = file?.size || 0;
  const sizeInMB = (sizeNum / (1024 * 1024)).toFixed(1);
  const fileSizeFormatted =
    sizeNum <= 0
      ? '1.0 MB'
      : parseFloat(sizeInMB) < 0.1
      ? `${Math.max(1, Math.round(sizeNum / 1024))} KB`
      : `${sizeInMB} MB`;

  // Heuristic baseline in case of encrypted/compressed stream PDFs
  const estimatedPages = Math.max(1, Math.min(1500, Math.round(sizeNum / (110 * 1024)) || 1));

  if (sizeNum < 400) {
    return { pagesCount: 1, fileSizeFormatted };
  }

  try {
    const parseTask = (async (): Promise<number> => {
      // Scan first 512KB of the file where /Count normally resides
      const headSize = Math.min(sizeNum, 512 * 1024);
      const headBuffer = await file.slice(0, headSize).arrayBuffer();
      const headPages = scanPdfPagesFromBuffer(headBuffer);
      if (headPages > 0) return headPages;

      // Scan last 256KB of the file if larger
      if (sizeNum > headSize) {
        const tailStart = Math.max(0, sizeNum - 256 * 1024);
        const tailBuffer = await file.slice(tailStart, sizeNum).arrayBuffer();
        const tailPages = scanPdfPagesFromBuffer(tailBuffer);
        if (tailPages > 0) return tailPages;
      }

      return estimatedPages;
    })();

    const timeoutTask = new Promise<number>((resolve) =>
      setTimeout(() => resolve(estimatedPages), 400)
    );

    let pagesCount = await Promise.race([parseTask, timeoutTask]);
    if (!pagesCount || pagesCount < 1) pagesCount = estimatedPages;
    if (pagesCount > 1500) pagesCount = 1500;

    return { pagesCount, fileSizeFormatted };
  } catch {
    return { pagesCount: estimatedPages, fileSizeFormatted };
  }
}

function scanPdfPagesFromBuffer(arrayBuffer: ArrayBuffer): number {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('latin1');
    const text = decoder.decode(bytes);

    const countMatches = [...text.matchAll(/\/Count\s+(\d+)/g)];
    if (countMatches.length > 0) {
      const counts = countMatches
        .map((m) => parseInt(m[1], 10))
        .filter((n) => !isNaN(n) && n > 0 && n <= 1500);
      if (counts.length > 0) {
        return Math.max(...counts);
      }
    }

    const pageMatches = [...text.matchAll(/\/Type\s*\/Page\b/g)];
    if (pageMatches.length > 0) {
      return Math.min(1500, pageMatches.length);
    }
  } catch {
    // ignore
  }
  return 0;
}
