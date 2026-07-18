/**
 * PDF text extraction with a 3-tier strategy:
 *   1. `pdftotext -layout` (poppler) — most reliable for tabular RFQs
 *   2. `pdfjs-dist` legacy build — pure-JS fallback if poppler fails
 *   3. OCR via `pdftoppm` -> `tesseract` (eng+ara) — for scanned PDFs
 *      that have no extractable text layer.
 *
 * Returns the best text we could obtain plus a `wasOcr` flag the route
 * surfaces to the UI.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger } from "../logger";

let pdfjsModule: typeof import("pdfjs-dist/legacy/build/pdf.mjs") | null = null;
async function loadPdfJs() {
  if (pdfjsModule) return pdfjsModule;
  pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsModule;
}

export interface ParsedPdf {
  text: string;
  pageCount: number;
  wasOcr: boolean;
  /** Which strategy produced the returned text. */
  source: "pdftotext" | "pdfjs" | "ocr" | "empty";
}

const MIN_USEFUL_CHARS = 200; // non-whitespace
const OCR_PAGE_LIMIT = 4; // cap OCR work — typical RFQs are 1-3 pages
const OCR_DPI = 150; // 200 was 2x slower, 150 still readable for tesseract
const PROC_TIMEOUT_MS = 45_000;
const OCR_BUDGET_MS = 75_000; // total OCR budget across all pages

function nonWs(s: string): number {
  return s.replace(/\s+/g, "").length;
}

function normalize(s: string): string {
  return s.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Run a subprocess, capturing stdout/stderr, with a hard timeout. */
function run(
  cmd: string,
  args: string[],
  opts: { input?: Buffer; cwd?: string; timeoutMs?: number } = {},
): Promise<{ stdout: Buffer; stderr: string; code: number }> {
  const timeoutMs = Math.max(1, opts.timeoutMs ?? PROC_TIMEOUT_MS);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd });
    const out: Buffer[] = [];
    const err: string[] = [];
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (d: Buffer) => out.push(d));
    child.stderr.on("data", (d: Buffer) => err.push(d.toString()));
    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout: Buffer.concat(out), stderr: err.join(""), code: code ?? 0 });
    });
    if (opts.input) {
      child.stdin.end(opts.input);
    } else {
      child.stdin.end();
    }
  });
}

/** Tier 1 — `pdftotext -layout` reading from stdin. */
async function tryPdftotext(buffer: Buffer): Promise<string> {
  try {
    const { stdout, code } = await run("pdftotext", ["-layout", "-q", "-", "-"], { input: buffer });
    if (code !== 0) return "";
    return normalize(stdout.toString("utf8"));
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "rfq pdfParser: pdftotext failed");
    return "";
  }
}

/** Tier 2 — pdfjs-dist legacy build. */
async function tryPdfJs(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const pdfjs = await loadPdfJs();
    const data = new Uint8Array(buffer);
    const doc = await pdfjs.getDocument({ data, disableFontFace: true, useSystemFonts: false }).promise;
    let combined = "";
    for (let i = 1; i <= doc.numPages; i++) {
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        combined += `\n${content.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ")}\n`;
      } catch (err) {
        logger.warn({ err, page: i }, "rfq pdfParser: pdfjs page extract failed");
      }
    }
    const pageCount = doc.numPages;
    await doc.destroy();
    return { text: normalize(combined), pageCount };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "rfq pdfParser: pdfjs failed");
    return { text: "", pageCount: 0 };
  }
}

/**
 * Tier 3 — OCR. Render each page to a 200dpi grayscale PNG via pdftoppm,
 * then run tesseract (eng+ara) on each image. Capped at OCR_PAGE_LIMIT
 * pages so a 100-page scan can't take forever.
 */
async function tryOcr(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const dir = await mkdtemp(join(tmpdir(), "rfq-ocr-"));
  try {
    const pdfPath = join(dir, "in.pdf");
    await writeFile(pdfPath, buffer);

    // Cap pages to OCR_PAGE_LIMIT BEFORE rendering. pdftoppm only renders
    // the requested page range, so an unbounded scan can't cost us minutes
    // of image conversion.
    let ppm: { stdout: Buffer; stderr: string; code: number };
    try {
      ppm = await run("pdftoppm", [
        "-png", "-r", String(OCR_DPI), "-gray",
        "-f", "1", "-l", String(OCR_PAGE_LIMIT),
        pdfPath, join(dir, "page"),
      ]);
    } catch (err) {
      // ENOENT — poppler not available in this environment. Surface a clear
      // log line and degrade gracefully so the analyze route can return an
      // empty-text result instead of 500ing.
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "rfq pdfParser: pdftoppm spawn failed (binary missing?)",
      );
      return { text: "", pageCount: 0 };
    }
    if (ppm.code !== 0) {
      logger.warn({ stderr: ppm.stderr.slice(0, 300) }, "rfq pdfParser: pdftoppm failed");
      return { text: "", pageCount: 0 };
    }
    const files = (await readdir(dir))
      .filter((f) => f.startsWith("page") && f.endsWith(".png"))
      .sort();
    if (files.length === 0) return { text: "", pageCount: 0 };

    // Run all pages in parallel under one shared deadline. Each page's
    // tesseract process gets a hard timeout derived from the remaining
    // budget so the whole OCR phase cannot exceed OCR_BUDGET_MS.
    //
    // Default language is `eng` only — `eng+ara` roughly triples
    // tesseract latency (~30s -> 60-90s per page) and Arabic-only
    // scanned RFQs are the minority case for our MENA users (most
    // tender PDFs are bilingual or English). A future iteration can
    // make this adaptive (eng first, retry pages with poor output
    // using `eng+ara`).
    const deadline = Date.now() + OCR_BUDGET_MS;
    const results = await Promise.allSettled(
      files.map(async (f) => {
        const remaining = deadline - Date.now();
        if (remaining <= 1000) throw new Error("ocr budget exhausted");
        // PSM 6 = "Assume a single uniform block of text" — works well
        // on tabular RFQ pages where the layout is column-heavy.
        const t = await run(
          "tesseract",
          [join(dir, f), "stdout", "-l", "eng", "--psm", "6"],
          { timeoutMs: remaining },
        );
        if (t.code !== 0) throw new Error(`tesseract exit ${t.code}`);
        return t.stdout.toString("utf8");
      }),
    );
    const out = results
      .map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        logger.warn(
          { reason: r.reason instanceof Error ? r.reason.message : String(r.reason), page: i + 1 },
          "rfq pdfParser: tesseract page failed/dropped",
        );
        return "";
      })
      .filter(Boolean);
    return { text: normalize(out.join("\n")), pageCount: files.length };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * OCR a single image (PNG/JPG/WebP/TIFF/etc) directly via tesseract.
 * Used when the user uploads a photo or screenshot of an RFQ instead of
 * a PDF. Bypasses pdftotext/pdfjs and goes straight to OCR.
 */
export async function parseImageBuffer(buffer: Buffer, mime: string): Promise<ParsedPdf> {
  const dir = await mkdtemp(join(tmpdir(), "rfq-img-"));
  try {
    const ext =
      mime.includes("png") ? ".png"
      : mime.includes("webp") ? ".webp"
      : mime.includes("tiff") ? ".tiff"
      : mime.includes("bmp") ? ".bmp"
      : ".jpg";
    const imgPath = join(dir, `in${ext}`);
    await writeFile(imgPath, buffer);
    let t: { stdout: Buffer; stderr: string; code: number };
    try {
      t = await run(
        "tesseract",
        [imgPath, "stdout", "-l", "eng", "--psm", "6"],
        { timeoutMs: OCR_BUDGET_MS },
      );
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "rfq parseImageBuffer: tesseract spawn failed (binary missing?)",
      );
      return { text: "", pageCount: 1, wasOcr: true, source: "empty" };
    }
    if (t.code !== 0) {
      logger.warn({ stderr: t.stderr.slice(0, 300) }, "rfq parseImageBuffer: tesseract failed");
      return { text: "", pageCount: 1, wasOcr: true, source: "empty" };
    }
    const text = normalize(t.stdout.toString("utf8"));
    return {
      text,
      pageCount: 1,
      wasOcr: true,
      source: nonWs(text) > 0 ? "ocr" : "empty",
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdf> {
  // Tier 1
  const t1 = await tryPdftotext(buffer);
  if (nonWs(t1) >= MIN_USEFUL_CHARS) {
    return { text: t1, pageCount: 0, wasOcr: false, source: "pdftotext" };
  }

  // Tier 2
  const t2 = await tryPdfJs(buffer);
  if (nonWs(t2.text) >= MIN_USEFUL_CHARS) {
    return { text: t2.text, pageCount: t2.pageCount, wasOcr: false, source: "pdfjs" };
  }

  // Tier 3 — OCR (best effort, may also return empty)
  logger.info(
    { t1Chars: nonWs(t1), t2Chars: nonWs(t2.text) },
    "rfq pdfParser: text extraction empty, falling back to OCR",
  );
  const ocr = await tryOcr(buffer);
  if (nonWs(ocr.text) > 0) {
    return { text: ocr.text, pageCount: ocr.pageCount, wasOcr: true, source: "ocr" };
  }

  // Last resort — return whichever tier had any chars at all (so the
  // route still records something in rawText).
  const best = nonWs(t2.text) >= nonWs(t1) ? t2.text : t1;
  return {
    text: best,
    pageCount: t2.pageCount,
    wasOcr: false,
    source: "empty",
  };
}
