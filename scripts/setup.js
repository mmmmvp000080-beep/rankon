/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const storageDirs = [
  "storage/uploads",
  "storage/signatures",
  "storage/pdfs",
  "storage/settings",
];

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit", shell: true });
}

run("node scripts/download-fonts.js");
run("npx prisma generate");
run("npx prisma migrate deploy");
run("npx tsx prisma/seed.ts");

for (const dir of storageDirs) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    console.log(`Created ${dir}`);
  }
}

console.log("Setup complete.");
