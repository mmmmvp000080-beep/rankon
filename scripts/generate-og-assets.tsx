import { spawnSync } from "node:child_process";
import path from "node:path";

const result = spawnSync(process.execPath, [path.join(process.cwd(), "scripts", "process-rankon-logo.js")], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
