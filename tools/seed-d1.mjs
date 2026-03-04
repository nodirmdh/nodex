#!/usr/bin/env node
import readline from "node:readline";
import { spawnSync } from "node:child_process";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

(async () => {
  const input = (await ask("D1 DB name (default: nodex-db): ")).trim();
  const dbName = input || "nodex-db";
  const modeInput = (await ask("Use remote D1? (Y/n): ")).trim().toLowerCase();
  rl.close();

  const remote = modeInput !== "n" && modeInput !== "no";
  const scopeFlag = remote ? "--remote" : "--local";

  console.log(`Seeding DB: ${dbName} (${remote ? "remote" : "local"})`);
  run("npm", ["--prefix", "worker", "run", "seed", "--", dbName, scopeFlag]);
})();
