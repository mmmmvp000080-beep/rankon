/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.join(__dirname, "..");
const fontDir = path.join(root, "public", "fonts");
const base = "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2";

const fonts = [
  "Pretendard-Regular.woff2",
  "Pretendard-Medium.woff2",
  "Pretendard-SemiBold.woff2",
  "Pretendard-Bold.woff2",
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
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
  for (const name of fonts) {
    const dest = path.join(fontDir, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      console.log(`Skip ${name} (${fs.statSync(dest).size} bytes)`);
      continue;
    }
    const url = `${base}/${name}`;
    console.log(`Downloading ${name}...`);
    await download(url, dest);
    console.log(`Saved ${name} (${fs.statSync(dest).size} bytes)`);
  }
  console.log("Pretendard fonts ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
