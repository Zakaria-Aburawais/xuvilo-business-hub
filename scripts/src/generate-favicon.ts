import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";

const SOURCE = path.resolve(
  process.cwd(),
  "../attached_assets/ChatGPT_Image_Apr_24__2026__04_15_42_AM-removebg-preview_1777003459766.png",
);
const OUT_DIR = path.resolve(process.cwd(), "../artifacts/businesses-hub/public");

async function findWMarkBounds(): Promise<{
  left: number;
  top: number;
  width: number;
  height: number;
}> {
  const img = sharp(SOURCE);
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const colHasPixel = new Array<boolean>(width).fill(false);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const a = data[idx + 3];
      if (a > 16) colHasPixel[x] = true;
    }
  }

  let firstCol = -1;
  for (let x = 0; x < width; x++) {
    if (colHasPixel[x]) {
      firstCol = x;
      break;
    }
  }
  if (firstCol < 0) throw new Error("Image is fully transparent");

  let gapStart = -1;
  for (let x = firstCol; x < width; x++) {
    if (!colHasPixel[x]) {
      let runEnd = x;
      while (runEnd < width && !colHasPixel[runEnd]) runEnd++;
      if (runEnd - x >= 6) {
        gapStart = x;
        break;
      }
      x = runEnd;
    }
  }
  if (gapStart < 0) throw new Error("Could not find gap between W mark and text");

  const left = firstCol;
  const right = gapStart - 1;

  let top = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = left; x <= right; x++) {
      const idx = (y * width + x) * channels;
      if (data[idx + 3] > 16) {
        if (top < 0) top = y;
        bottom = y;
        break;
      }
    }
  }
  if (top < 0) throw new Error("W mark not found vertically");

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

async function main() {
  const bounds = await findWMarkBounds();
  console.log("Detected W mark bounds:", bounds);

  const size = Math.max(bounds.width, bounds.height);
  const padding = Math.round(size * 0.08);
  const canvasSize = size + padding * 2;
  const offsetX = padding + Math.round((size - bounds.width) / 2);
  const offsetY = padding + Math.round((size - bounds.height) / 2);

  const cropped = await sharp(SOURCE)
    .extract(bounds)
    .toBuffer();

  const squared = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();

  await fs.mkdir(OUT_DIR, { recursive: true });

  const sizes = [16, 32, 48, 180, 192, 512];
  for (const s of sizes) {
    const fileName =
      s === 180 ? "apple-touch-icon.png" : `favicon-${s}x${s}.png`;
    const outPath = path.join(OUT_DIR, fileName);
    await sharp(squared)
      .resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`Wrote ${outPath}`);
  }

  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(
    icoSizes.map((s) =>
      sharp(squared)
        .resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
    ),
  );
  const ico = buildIco(icoBuffers, icoSizes);
  const icoPath = path.join(OUT_DIR, "favicon.ico");
  await fs.writeFile(icoPath, ico);
  console.log(`Wrote ${icoPath}`);

  const oldSvg = path.join(OUT_DIR, "favicon.svg");
  try {
    await fs.unlink(oldSvg);
    console.log(`Removed ${oldSvg}`);
  } catch {
    /* ignore */
  }
}

function buildIco(pngBuffers: Buffer[], sizes: number[]): Buffer {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(dirEntrySize * count);
  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    const s = sizes[i];
    const e = i * dirEntrySize;
    entries.writeUInt8(s >= 256 ? 0 : s, e + 0);
    entries.writeUInt8(s >= 256 ? 0 : s, e + 1);
    entries.writeUInt8(0, e + 2);
    entries.writeUInt8(0, e + 3);
    entries.writeUInt16LE(1, e + 4);
    entries.writeUInt16LE(32, e + 6);
    entries.writeUInt32LE(png.length, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += png.length;
  }

  return Buffer.concat([header, entries, ...pngBuffers]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
