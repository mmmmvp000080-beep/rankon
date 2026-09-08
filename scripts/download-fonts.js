/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.join(__dirname, "..");
const fontDir = path.join(root, "public", "fonts");

const fonts = [
  {
    name: "NotoSansKR-Regular.ttf",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@5.0.0/korean-400-normal.ttf",
  },
  {
    name: "NotoSansKR-Bold.ttf",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@5.0.0/korean-700-normal.ttf",
  },
  {
    name: "NotoSansKR-Regular.otf",
    url: "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf",
  },
  {
    name: "NotoSansKR-Bold.otf",
    url: "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansCJKkr-Bold.otf",
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(fontDir, { recursive: true });
  for (const font of fonts) {
    const dest = path.join(fontDir, font.name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      console.log(`Skip ${font.name} (exists)`);
      continue;
    }
    console.log(`Downloading ${font.name}...`);
    await download(font.url, dest);
    console.log(`Saved ${font.name}`);
  }
  console.log("Fonts ready.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
