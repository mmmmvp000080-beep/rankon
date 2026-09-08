/**
 * Process RankOn official logo: remove black background, crop, symbol, favicons, OG cards.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "brand");
const LOCAL_SRC = path.join(OUT, "rankon-logo-source.png");
const CURSOR_SRC = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-a0804-Desktop-rankon-contract/assets",
  "c__Users_a0804_AppData_Roaming_Cursor_User_workspaceStorage_1ad4b3ee52a8b5a5ce0518c401ad7bb7_images_logo-c47af96a-ee63-45c9-92c8-3c491648ba41.png"
);
const SRC = process.argv[2]
  ? path.resolve(process.argv[2])
  : fs.existsSync(CURSOR_SRC)
    ? CURSOR_SRC
    : LOCAL_SRC;
const OG_DIR = path.join(ROOT, "public", "og");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function toHex(r, g, b) {
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function sampleOrange(data, width, height) {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 40) continue;
    if (r < 140 || r < g + 20 || r < b + 40) continue;
    if (g > 200 && b > 160) continue;
    rSum += r;
    gSum += g;
    bSum += b;
    count += 1;
  }
  if (!count) return { hex: "#FF5A1F", r: 255, g: 90, b: 31 };
  const r = Math.round(rSum / count);
  const g = Math.round(gSum / count);
  const b = Math.round(bSum / count);
  return { hex: toHex(r, g, b), r, g, b };
}

function knockOutBlack(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (max < 38 && lum < 28) {
      data[i + 3] = 0;
      continue;
    }
    if (max < 55 && lum < 40) {
      data[i + 3] = Math.round((max / 55) * 180);
    }
  }
}

function contentBBox(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return null;
  const pad = 4;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width, maxX + pad + 1);
  const bottom = Math.min(height, maxY + pad + 1);
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function symbolWidth(data, width, height, bbox) {
  const densities = [];
  for (let x = bbox.left; x < bbox.left + bbox.width; x++) {
    let n = 0;
    for (let y = bbox.top; y < bbox.top + bbox.height; y++) {
      if (data[(y * width + x) * 4 + 3] > 20) n += 1;
    }
    densities.push(n / bbox.height);
  }
  let started = false;
  let gapStart = -1;
  for (let i = 0; i < densities.length; i++) {
    if (!started && densities[i] > 0.04) started = true;
    if (!started) continue;
    if (densities[i] < 0.012) {
      if (gapStart < 0) gapStart = i;
      if (i - gapStart > Math.max(8, Math.round(bbox.height * 0.04))) {
        return Math.min(bbox.width, gapStart + 6);
      }
    } else {
      gapStart = -1;
    }
  }
  return Math.round(bbox.height * 1.05);
}

function toInkOnLight(data, orange) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 8) continue;
    const isOrange = r > 140 && r > g + 15 && r > b + 30 && g < 190;
    if (isOrange) {
      data[i] = orange.r;
      data[i + 1] = orange.g;
      data[i + 2] = orange.b;
      continue;
    }
    data[i] = 17;
    data[i + 1] = 17;
    data[i + 2] = 17;
  }
}

async function saveRaw(data, info, dest) {
  await sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(dest);
}

async function main() {
  if (!fs.existsSync(SRC)) {
    throw new Error(`Logo source not found: ${SRC}`);
  }

  ensureDir(OUT);
  ensureDir(OG_DIR);
  ensureDir(path.join(ROOT, "src", "app"));

  const sourceOut = LOCAL_SRC;
  if (path.resolve(SRC) !== path.resolve(sourceOut)) {
    fs.copyFileSync(SRC, sourceOut);
  }

  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data);
  knockOutBlack(pixels);
  const orange = sampleOrange(pixels, info.width, info.height);
  const bbox = contentBBox(pixels, info.width, info.height);
  if (!bbox) throw new Error("Could not find logo pixels");
  bbox.width = Math.min(bbox.width, info.width - bbox.left);
  bbox.height = Math.min(bbox.height, info.height - bbox.top);

  const cropped = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract(bbox)
    .png()
    .toBuffer();

  const transparentPath = path.join(OUT, "rankon-logo-transparent.png");
  await sharp(cropped).png().toFile(transparentPath);
  await sharp(cropped).png().toFile(path.join(OUT, "logo-full.png"));

  const { data: cropData, info: cropInfo } = await sharp(cropped).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const cropPixels = new Uint8Array(cropData);
  const ink = new Uint8Array(cropPixels);
  toInkOnLight(ink, orange);
  const inkPath = path.join(OUT, "rankon-logo-on-light.png");
  await saveRaw(ink, cropInfo, inkPath);

  const fullBBox = { left: 0, top: 0, width: cropInfo.width, height: cropInfo.height };
  const symW = Math.min(
    cropInfo.width,
    Math.max(24, symbolWidth(cropPixels, cropInfo.width, cropInfo.height, fullBBox))
  );
  const symbolBuf = await sharp(cropped)
    .extract({
      left: 0,
      top: 0,
      width: symW,
      height: cropInfo.height,
    })
    .png()
    .toBuffer();
  const symbolPath = path.join(OUT, "rankon-symbol-transparent.png");
  await sharp(symbolBuf).png().toFile(symbolPath);

  const symbolMeta = await sharp(symbolBuf).metadata();
  const fullMeta = await sharp(cropped).metadata();

  async function writeIcon(size, dests) {
    const inner = Math.round(size * 0.68);
    const pad = Math.round((size - inner) / 2);
    const glyph = await sharp(symbolBuf)
      .resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const icon = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 255 },
      },
    })
      .composite([{ input: glyph, left: pad, top: pad }])
      .png()
      .toBuffer();
    for (const dest of dests) {
      ensureDir(path.dirname(dest));
      await writeFileSafe(dest, icon);
    }
  }

  async function writeFileSafe(dest, buf) {
    fs.writeFileSync(dest, buf);
  }

  await writeIcon(512, [path.join(ROOT, "public", "icon.png"), path.join(ROOT, "src", "app", "icon.png")]);
  await writeIcon(180, [
    path.join(ROOT, "public", "apple-icon.png"),
    path.join(ROOT, "src", "app", "apple-icon.png"),
  ]);
  await writeIcon(32, [
    path.join(ROOT, "public", "favicon.ico"),
    path.join(ROOT, "src", "app", "favicon.ico"),
  ]);

  const logoForOg = await sharp(cropped)
    .resize({ width: 520, height: 220, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  async function writeOg(title, description, dest) {
    const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#000000"/>
  <rect x="72" y="520" width="120" height="3" fill="${orange.hex}"/>
  <text x="72" y="560" font-family="Malgun Gothic, sans-serif" font-size="36" font-weight="700" fill="#FFFFFF">${title}</text>
  <text x="72" y="598" font-family="Malgun Gothic, sans-serif" font-size="20" fill="#A3A3A3">${description}</text>
</svg>`);
    const card = await sharp(svg)
      .composite([{ input: logoForOg, left: 340, top: 120 }])
      .png()
      .toBuffer();
    fs.writeFileSync(dest, card);
  }

  await writeOg(
    "랭크온 전자계약",
    "안전하고 간편하게 계약 내용을 확인하고 서명하세요.",
    path.join(OG_DIR, "contract-share.png")
  );
  await writeOg(
    "랭크온 파일 제출",
    "요청받은 파일을 안전하게 제출해 주세요.",
    path.join(OG_DIR, "submit-share.png")
  );

  const meta = {
    source: "rankon-logo-source.png",
    width: fullMeta.width,
    height: fullMeta.height,
    aspectFull: Number(((fullMeta.width || 1) / (fullMeta.height || 1)).toFixed(4)),
    aspectSymbol: Number(((symbolMeta.width || 1) / (symbolMeta.height || 1)).toFixed(4)),
    orange: orange.hex,
    processedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, "logo-meta.json"), JSON.stringify(meta, null, 2));

  console.log("Processed RankOn logo");
  console.log("  orange", orange.hex);
  console.log("  full", fullMeta.width, "x", fullMeta.height, "aspect", meta.aspectFull);
  console.log("  symbol", symbolMeta.width, "x", symbolMeta.height, "aspect", meta.aspectSymbol);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
