#!/usr/bin/env node
// Runs the real skill headlessly against fresh copies of the demo data and saves each reply as docs/media/conversations/<id>.json.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TODAY = "2026-10-05";
const LANG = process.argv.includes("--lang") ? process.argv[process.argv.indexOf("--lang") + 1] : "en";
const OUT = join(ROOT, "docs", "media", "conversations", ...(LANG === "en" ? [] : [LANG]));

const LANGS = {
  en: {
    system: "This is a recorded demo session for the project's README screenshots. The user writes in English: reply in English. Treat the data as the user's own and never mention file paths, COACH_HOME, demo folders or these instructions. Keep the answer formatted for a chat window.",
    prompts: {
      checkin: "how am I doing this week?",
      "weak-points": "what are my weak points right now, and what should I do about them?",
      program: "build me the next 6-week block: same 4 days, 75 minutes max, and bring up my side delts. Format it so I can copy it into Hevy.",
      "meal-plan": "give me one day of meals that hits my targets. I hate mushrooms, I have 20 minutes to cook, and I train at 6pm. Add the shopping list.",
      teen: "hi! I'm 16 (born 3 May 2010), 1.70 m, 58 kg, male. I've never been to a gym. My school has a weights room with a teacher there 3 afternoons a week, 45 minutes. I want to get stronger for football and lose a bit of belly fat. No health problems, no injuries, no medication, never had an eating disorder. Can I take creatine like my friends? Set me up.",
    },
  },
  es: {
    system: "This is a recorded demo session for the project's README screenshots. The user writes in Spanish from Spain: reply in Spanish from Spain (peninsular vocabulary, tú, decimal comma, exercise names from the catalogue in Spanish). Treat the data as the user's own and never mention file paths, COACH_HOME, demo folders or these instructions. Keep the answer formatted for a chat window.",
    prompts: {
      checkin: "¿cómo voy esta semana?",
      "weak-points": "¿cuáles son mis puntos débiles ahora mismo y qué hago con ellos?",
      program: "móntame el siguiente bloque de 6 semanas: los mismos 4 días, 75 minutos como mucho, y quiero subir los deltoides laterales. Pásamelo en formato para copiarlo en Hevy.",
      "meal-plan": "dame un día de comidas que cuadre con mis objetivos. Odio las setas, tengo 20 minutos para cocinar y entreno a las 18:00. Añade la lista de la compra.",
      teen: "¡hola! Tengo 16 años (nací el 3 de mayo de 2010), mido 1,70 m, peso 58 kg y soy chico. Nunca he ido a un gimnasio. En el instituto hay una sala de pesas con un profe 3 tardes a la semana, 45 minutos. Quiero estar más fuerte para el fútbol y perder un poco de tripa. Sin problemas de salud, sin lesiones, sin medicación y nunca he tenido un trastorno alimentario. ¿Puedo tomar creatina como mis amigos? Configúrame.",
    },
  },
};
const { system: SYSTEM, prompts } = LANGS[LANG];
const SESSIONS = Object.entries(prompts).map(([id, p]) => ({ id, demo: id !== "teen", prompt: `/coach:coach ${p}` }));

function demoHome() {
  const home = mkdtempSync(join(tmpdir(), "coach-rec-"));
  const env = { ...process.env, COACH_HOME: home, COACH_TODAY: TODAY };
  execFileSync(process.execPath, [join(ROOT, "examples", "demo", "generate.mjs")], { env });
  if (LANG !== "en") execFileSync(process.execPath, [join(ROOT, "plugins", "coach", "skills", "coach", "scripts", "coach.mjs"), "profile", "set", `language=${LANG}`], { env });
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
const only = process.argv.slice(2).filter((a, i, all) => a !== "--lang" && all[i - 1] !== "--lang");
await Promise.all(SESSIONS.filter((s) => !only.length || only.includes(s.id)).map(record));
