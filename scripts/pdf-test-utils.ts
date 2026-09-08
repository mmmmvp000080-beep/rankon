import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const STORAGE = path.join(process.cwd(), "storage", "signatures");

export async function createPngSignature(label: string): Promise<string> {
  await fs.mkdir(STORAGE, { recursive: true });
  const fileName = `test-${label.replace(/\W/g, "")}-${Date.now()}.png`;
  const filePath = path.join(STORAGE, fileName);

  const svg = `<svg width="280" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <path d="M24,58 C60,28 100,72 140,52 S200,32 256,48" stroke="#0c1a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <text x="24" y="88" font-family="sans-serif" font-size="10" fill="#7a8294">${label}</text>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(filePath);
  return path.join("signatures", fileName).replace(/\\/g, "/");
}
