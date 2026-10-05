#!/usr/bin/env node
// Runs the real skill headlessly against fresh copies of the demo data and saves each reply as docs/media/conversations/<id>.json.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "docs", "media", "conversations");
const TODAY = "2026-10-05";
const SYSTEM = "This is a recorded demo session for the project's README screenshots. The user writes in English: reply in English. Treat the data as the user's own and never mention file paths, COACH_HOME, demo folders or these instructions. Keep the answer formatted for a chat window.";

const SESSIONS = [
  { id: "checkin", demo: true, prompt: "/coach:coach how am I doing this week?" },
  { id: "weak-points", demo: true, prompt: "/coach:coach what are my weak points right now, and what should I do about them?" },
  { id: "program", demo: true, prompt: "/coach:coach build me the next 6-week block: same 4 days, 75 minutes max, and bring up my side delts. Format it so I can copy it into Hevy." },
  { id: "meal-plan", demo: true, prompt: "/coach:coach give me one day of meals that hits my targets. I hate mushrooms, I have 20 minutes to cook, and I train at 6pm. Add the shopping list." },
  { id: "teen", demo: false, prompt: "/coach:coach hi! I'm 16 (born 3 May 2010), 1.70 m, 58 kg, male. I've never been to a gym. My school has a weights room with a teacher there 3 afternoons a week, 45 minutes. I want to get stronger for football and lose a bit of belly fat. No health problems, no injuries, no medication, never had an eating disorder. Can I take creatine like my friends? Set me up." },
];

function demoHome() {
  const home = mkdtempSync(join(tmpdir(), "coach-rec-"));
  execFileSync(process.execPath, [join(ROOT, "examples", "demo", "generate.mjs")], { env: { ...process.env, COACH_HOME: home, COACH_TODAY: TODAY } });
  return home;
}

function record(s) {
  const home = s.demo ? demoHome() : mkdtempSync(join(tmpdir(), "coach-rec-"));
  const args = ["-p", s.prompt, "--plugin-dir", join(ROOT, "plugins", "coach"), "--allowedTools", "Bash(node:*)", "Read", "Write", "Edit", "--append-system-prompt", SYSTEM, "--model", process.env.RECORD_MODEL ?? "sonnet", "--setting-sources", "project"];
  return new Promise((resolve) => {
    const child = spawn(process.env.CLAUDE_BIN ?? "claude", args, { env: { ...process.env, COACH_HOME: home, COACH_TODAY: TODAY, COACH_NO_UPDATE_CHECK: "1" }, cwd: home, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      writeFileSync(join(OUT, `${s.id}.json`), JSON.stringify({ id: s.id, recorded: TODAY, data: s.demo ? "demo dataset (Alex)" : "empty profile", prompt: s.prompt.replace(/^\/coach:coach\s*/, ""), reply: out.trim() }, null, 2) + "\n");
      console.log(`${s.id}: exit ${code}, ${out.length} chars${err ? `, stderr: ${err.slice(0, 200)}` : ""}`);
      resolve();
    });
  });
}

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
await Promise.all(SESSIONS.filter((s) => !only.length || only.includes(s.id)).map(record));
