#!/usr/bin/env node
// Renders every README raster from the HTML sources in docs/media/src with Playwright + ffmpeg.
// Usage: npm run media                               (everything, English and Spanish)
//        npm run media -- banner screens phone demo   (a subset)
//        npm run media -- --lang es screens          (one language: en → docs/media, es → docs/media/es)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MEDIA = dirname(fileURLToPath(import.meta.url));
const ROOT = join(MEDIA, "..", "..");
const SRC = join(MEDIA, "src");
const CACHE = join(MEDIA, ".cache");
const TODAY = "2026-10-05";
const ENGINE = join(ROOT, "plugins", "coach", "skills", "coach", "scripts", "coach.mjs");
const argv = process.argv.slice(2);
const langArg = argv.includes("--lang") ? argv[argv.indexOf("--lang") + 1] : "en,es";
const only = new Set(argv.filter((a, i) => a !== "--lang" && argv[i - 1] !== "--lang"));
const want = (k) => only.size === 0 || only.has(k);
const INSTALL = "/plugin marketplace add FlatHill70/coach-ai";

// ---------- real engine data (demo user Alex) ----------
const home = mkdtempSync(join(tmpdir(), "coach-media-"));
const env = { ...process.env, COACH_HOME: home, COACH_TODAY: TODAY, COACH_NO_UPDATE_CHECK: "1" };
execFileSync(process.execPath, [join(ROOT, "examples", "demo", "generate.mjs")], { env, stdio: "ignore" });
const engine = (...args) => JSON.parse(execFileSync(process.execPath, [ENGINE, ...args], { env, encoding: "utf8" }));
const last = engine("workouts", "last", "--n", "4");
const targets = engine("nutrition", "targets");
const days = engine("nutrition", "days");
const weight = engine("body", "weight");
const status = engine("status");
rmSync(home, { recursive: true, force: true });

const lastWeek = weight.weeks[weight.weeks.length - 1];
const kcalAvg = days.last7CompleteDays.kcal;
const kcalTarget = targets.calories.target;
const squatKg = parseFloat(last.flatMap((s) => s.exercises).find((e) => e.exercise === "Squat (Barbell)").top);

// ---------- per-language copy: every mark is quoted verbatim from that language's recorded reply ----------
const L10N = {
  en: {
    dir: "",
    locale: "en-GB",
    nf: new Intl.NumberFormat("en-GB"),
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    tagline: "A personal training and nutrition coach for every level, from first day to competition.",
    ui: {},
    extra: (w, kcal) => [
      { key: "weight", label: "Weight", value: `${w} kg avg` },
      { key: "food", label: "Food", value: `${kcal} kcal avg` },
    ],
    short: {
      "Bench Press (Barbell)": "Bench press",
      "Bent Over Row (Barbell)": "Barbell row",
      "Overhead Press (Dumbbell)": "DB shoulder press",
      "Squat (Barbell)": "Squat",
      "Romanian Deadlift (Barbell)": "Romanian DL",
      "Leg Press (Machine)": "Leg press",
      "Incline Bench Press (Dumbbell)": "Incline DB press",
      "Pull Up": "Pull-ups",
      "Lateral Raise (Dumbbell)": "Lateral raise",
      "Deadlift (Barbell)": "Deadlift",
      "Seated Leg Curl (Machine)": "Leg curl",
    },
    corrections(reply, kcal) {
      const squatNext = parseFloat(reply.match(/Squat:\*\*[^\n]*?go up to ([\d.]+) kg/)[1]);
      const latSets = +reply.match(/add (\d+) sets of lateral raises/)[1];
      return [
        { key: "Squat (Barbell)", mark: "circle", note: [`+${(squatNext - squatKg).toFixed(1)} kg`], dy: -2, rot: -5 },
        { key: "Lateral Raise (Dumbbell)", mark: "circle", note: ["side delts", `+${latSets} sets`], dy: -14, rot: -4 },
        { key: "food", mark: "underline", note: ["keep", `${kcal} kcal`], dy: -16, rot: -3, bend: 0.2 },
      ];
    },
    screens: {
      checkin: { label: "weekly check-in", marks: [
        { text: "0.27 %/week", mark: "circle" },
        { text: "3.5 sets a week", mark: "circle", note: ["10–18", "sets"] },
        { text: "100 kg × 6", mark: "circle", note: ["3 weeks"] },
      ] },
      "weak-points": { label: "weak points", marks: [
        { text: "3.5 direct sets a week", mark: "circle", note: ["10+"] },
        { text: "−0.5%/week", mark: "underline", double: true },
        { text: "100 kg × 6 @ RPE 8", mark: "circle", note: ["3 weeks"] },
      ] },
      program: { label: "next block", marks: [
        { text: "2 → 12 direct sets a week", mark: "underline", note: ["12 sets"] },
        { text: "66 → 73", mark: "circle", note: ["+10%"] },
        { text: "RIR 4", mark: "circle", note: ["deload"] },
      ] },
      "meal-plan": { label: "meal plan", marks: [
        { text: "2,560 kcal", mark: "circle" },
        { text: "2.2 g/kg", mark: "circle", note: ["top of", "range"] },
        { text: "2,605 kcal", mark: "circle", note: ["recent", "avg"] },
      ] },
      teen: { label: "first setup, age 16", marks: [
        { text: "Short answer on creatine: not right now.", mark: "underline" },
        { text: "about 45 minutes", mark: "circle", note: ["45 min"] },
        { text: "RIR 3", mark: "circle", note: ["3 in", "the tank"] },
      ] },
    },
    phones: {
      checkin: { label: "check-in", marks: [
        { text: "76.4 kg", mark: "circle" },
        { text: "2,599 kcal", mark: "circle", note: ["on", "target"] },
      ] },
      teen: { label: "first setup", marks: [
        { text: "Short answer on creatine: not right now.", mark: "underline", note: ["under", "18"] },
      ] },
    },
  },
  es: {
    dir: "es",
    locale: "es-ES",
    nf: new Intl.NumberFormat("es-ES", { useGrouping: "always" }),
    months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    tagline: "Un entrenador personal de fuerza y nutrición para cualquier nivel, del primer día a la competición.",
    ui: { name: "Nombre", weekOf: "Semana del", demo: "datos demo", continues: "sigue…", reply: "Responder a Claude…", cols: ["Fecha", "Ejercicio", "Series", "Notas"] },
    extra: (w, kcal) => [
      { key: "weight", label: "Peso", value: `media ${w} kg` },
      { key: "food", label: "Comida", value: `media ${kcal} kcal` },
    ],
    short: {
      "Bench Press (Barbell)": "Press banca",
      "Bent Over Row (Barbell)": "Remo con barra",
      "Overhead Press (Dumbbell)": "Press militar manc.",
      "Squat (Barbell)": "Sentadilla",
      "Romanian Deadlift (Barbell)": "PM rumano",
      "Leg Press (Machine)": "Prensa",
      "Incline Bench Press (Dumbbell)": "Press incl. manc.",
      "Pull Up": "Dominadas",
      "Lateral Raise (Dumbbell)": "Elev. laterales",
      "Deadlift (Barbell)": "Peso muerto",
      "Seated Leg Curl (Machine)": "Curl femoral",
    },
    corrections(reply, kcal) {
      const [, kg, reps] = reply.match(/\*\*Sentadilla\*\*: sube a ([\d,]+) kg × (\d+)/);
      const latSets = +reply.match(/\+(\d+) series de elevaciones laterales/)[1];
      return [
        { key: "Squat (Barbell)", mark: "circle", note: [`${kg} × ${reps}`], dy: -2, rot: -5 },
        { key: "Lateral Raise (Dumbbell)", mark: "circle", note: ["laterales", `+${latSets} series`], dy: -14, rot: -4 },
        { key: "food", mark: "underline", note: ["mantén", `${kcal} kcal`], dy: -16, rot: -3, bend: 0.2 },
      ];
    },
    screens: {
      checkin: { label: "repaso semanal", marks: [
        { text: "+0,27 %/semana", mark: "circle" },
        { text: "3,5 series semanales", mark: "circle", note: ["10–18", "series"] },
        { text: "100 kg × 6", mark: "circle", note: ["3 sem."] },
      ] },
      "weak-points": { label: "puntos débiles", marks: [
        { text: "3,5 series directas por semana", mark: "circle", note: ["10+"] },
        { text: "−0,5 % por semana", mark: "underline", double: true },
        { text: "100 kg × 6 @ RPE 8", mark: "circle", note: ["3 sem."] },
      ] },
      program: { label: "siguiente bloque", marks: [
        { text: "2 → 8 series/semana", mark: "underline", note: ["luego 10"] },
        { text: "un 3 % más", mark: "circle", note: ["≤ 75 min"] },
        { text: "RIR 0-1", mark: "circle", note: ["desde", "sem. 2"] },
      ] },
      "meal-plan": { label: "menú del día", marks: [
        { text: "unas 2.590 kcal", mark: "circle" },
        { text: "~2,2 g/kg", mark: "circle", note: ["en", "rango"] },
        { text: "8:00 · Desayuno", mark: "underline" },
      ] },
      teen: { label: "alta, 16 años", marks: [
        { text: "Ahora mismo no te la recomiendo.", mark: "underline" },
        { text: "3 tardes de 45 min", mark: "circle", note: ["3 × 45"] },
        { text: "RIR 3", mark: "circle", note: ["3 en", "reserva"] },
      ] },
    },
    phones: {
      checkin: { label: "repaso", marks: [
        { text: "76,41 kg", mark: "circle" },
        { text: "2.599 kcal", mark: "circle", note: ["≈ meta"] },
      ] },
      teen: { label: "alta", marks: [
        { text: "Ahora mismo no te la recomiendo.", mark: "underline", note: ["< 18"] },
      ] },
    },
  },
};

// ---------- rendering ----------
const browser = await chromium.launch();
const url = (f, q = "") => pathToFileURL(join(SRC, f)).href + q;

async function open(file, data, viewport, dpr, q = "") {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, reducedMotion: "no-preference" });
  await ctx.addInitScript((d) => { window.__MEDIA__ = d; }, data);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`[${file}] ${e.message}`));
  await page.goto(url(file, q));
  await page.waitForSelector("body[data-ready='1']", { timeout: 20000 });
  return { ctx, page };
}

const outputs = [];
const report = [];
async function shot(page, file, origin) {
  const path = join(MEDIA, file);
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, animations: "disabled" });
  outputs.push({ path, origin });
  return path;
}

function fmtSets(s, nf) {
  const sets = s.split(",").map((x) => x.trim());
  const parsed = sets.map((x) => x.match(/^(?:([\d.]+)kg×(\d+)|(\d+) reps)@/));
  if (parsed.every((m) => m && m[3])) return parsed.map((m) => m[3]).join(", ");
  const kg = (v) => nf.format(+v);
  const ws = new Set(parsed.map((m) => m[1]));
  if (ws.size === 1) return `${kg(parsed[0][1])} × ${parsed.map((m) => m[2]).join(", ")}`;
  return parsed.map((m) => `${kg(m[1])}×${m[2]}`).join(", ");
}
const dm = (iso) => { const [, m, d] = iso.split("-"); return `${+d}/${+m}`; };

const FFMPEG = [process.env.FFMPEG, "C:\\Program Files\\ShareX\\ffmpeg.exe", "/usr/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"].find((p) => p && existsSync(p)) || "ffmpeg";
const FPS = 12.5;

for (const lang of langArg.split(",")) {
  const T = L10N[lang];
  if (!T) throw new Error(`unknown language "${lang}" (expected ${Object.keys(L10N).join(", ")})`);
  const out = (f) => (T.dir ? `${T.dir}/${f}` : f);
  const convPath = (id) => ["docs", "media", "conversations", ...(T.dir ? [T.dir] : []), `${id}.json`].join("/");
  const conv = Object.fromEntries(Object.keys(T.screens).map((id) => [id, JSON.parse(readFileSync(join(ROOT, convPath(id)), "utf8"))]));

  const dayName = (iso) => {
    const d = new Date(iso + "T12:00:00Z").toLocaleDateString(T.locale, { weekday: "short", timeZone: "UTC" }).replace(".", "");
    return d[0].toUpperCase() + d.slice(1);
  };
  const sessions = last.map((s) => ({
    date: `${dayName(s.date)} ${dm(s.date)}`,
    title: s.title,
    rows: s.exercises.filter((e) => T.short[e.exercise]).map((e) => ({ key: e.exercise, ex: T.short[e.exercise], sets: fmtSets(e.sets, T.nf) })),
  }));
  const week = {
    name: status.profile.name,
    weekOf: `${+last[0].date.slice(8)} ${T.months[+last[0].date.slice(5, 7) - 1]}`,
    sessions,
    ui: T.ui,
    extra: T.extra(T.nf.format(+lastWeek.avg.toFixed(1)), T.nf.format(kcalAvg)),
  };

  // The three coach corrections come from the recorded check-in reply; each is asserted against it.
  const checkin = conv.checkin.reply;
  const kcal = T.nf.format(kcalTarget);
  if (!checkin.includes(`${kcal} kcal`)) throw new Error(`${lang}: check-in reply does not cite the engine kcal target (${kcal} kcal)`);
  const corrections = T.corrections(checkin, kcal);
  const MEDIA_DATA = { lang, week, corrections, tagline: T.tagline, install: INSTALL };
  const engineText = `real Coach engine output for the demo user Alex (examples/demo/generate.mjs) and corrections quoted from ${convPath("checkin")}`;
  console.log(`[${lang}] engine: ${sessions.length} sessions, squat ${squatKg} kg, corrections ${corrections.map((c) => c.note.join(" ")).join(" | ")}, weight ${lastWeek.avg} kg`);

  if (want("banner")) {
    for (const theme of ["light", "dark"]) {
      const { ctx, page } = await open("banner.html", { ...MEDIA_DATA, theme }, { width: 1280, height: 640 }, 2);
      await shot(page, out(`banner-${theme}.png`), { html: "banner.html", text: engineText });
      await ctx.close();
    }
    if (lang === "en") {
      const { ctx, page } = await open("banner.html", { ...MEDIA_DATA, theme: "light" }, { width: 1280, height: 640 }, 1);
      await shot(page, "social-preview.png", { html: "banner.html", text: engineText });
      await ctx.close();
    }
  }

  const dateLabel = `${dayName(TODAY)} ${dm(TODAY)}`;

  if (want("screens")) {
    for (const [id, s] of Object.entries(T.screens)) {
      for (const m of s.marks) if (!conv[id].reply.includes(m.text)) throw new Error(`${lang}/${id}: "${m.text}" is not in the recorded reply`);
      const { ctx, page } = await open("screen.html", { lang, ui: T.ui, prompt: conv[id].prompt, reply: conv[id].reply, marks: s.marks, label: s.label, date: dateLabel, seed: 300 + id.length * 7 }, { width: 800, height: 1100 }, 2);
      const r = await page.evaluate(() => window.__RESULT__);
      await page.setViewportSize({ width: 800, height: r.height });
      await shot(page, out(`screens/${id}.png`), { html: "screen.html", text: `recorded conversation ${convPath(id)}, rendered verbatim (truncated at a paragraph boundary)` });
      report.push(`[${lang}] ${id}: ${r.truncated ? "truncated" : "full"}; marks ${r.placed.map((p) => (p.found ? "ok" : `MISSING(${p.text})`)).join(", ")}`);
      await ctx.close();
    }
  }

  if (want("phone")) {
    for (const [id, s] of Object.entries(T.phones)) {
      for (const m of s.marks) if (!conv[id].reply.includes(m.text)) throw new Error(`${lang}/${id}: "${m.text}" is not in the recorded reply`);
      const { ctx, page } = await open("phone.html", { lang, ui: T.ui, prompt: conv[id].prompt, reply: conv[id].reply, marks: s.marks, label: s.label, date: dateLabel, seed: 500 + id.length * 5 }, { width: 560, height: 900 }, 3);
      const r = await page.evaluate(() => window.__RESULT__);
      await page.setViewportSize({ width: 560, height: Math.ceil(r.height) });
      await shot(page, out(`screens/${id}-phone.png`), { html: "phone.html", text: `recorded conversation ${convPath(id)}, rendered verbatim` });
      report.push(`[${lang}] ${id}-phone: marks ${r.placed.map((p) => (!p.found ? `MISSING(${p.text})` : p.y > r.limitY ? `HIDDEN(${p.text})` : "ok")).join(", ")}`);
      await ctx.close();
    }
  }

  if (want("demo")) {
    const frames = join(CACHE, `frames-${lang}`);
    rmSync(frames, { recursive: true, force: true });
    mkdirSync(frames, { recursive: true });
    const { ctx, page } = await open("demo.html", { ...MEDIA_DATA, theme: "light" }, { width: 960, height: 540 }, 1);
    const { duration } = await page.evaluate(() => window.__DEMO__);
    const n = Math.round((duration / 1000) * FPS);
    for (let i = 0; i < n; i++) {
      const t = (i * 1000) / FPS;
      await page.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);
      await page.screenshot({ path: join(frames, `f${String(i).padStart(4, "0")}.png`) });
    }
    await ctx.close();
    const gif = join(MEDIA, out("demo.gif"));
    mkdirSync(dirname(gif), { recursive: true });
    const input = ["-y", "-v", "error", "-framerate", String(FPS), "-i", join(frames, "f%04d.png")];
    const palette = join(CACHE, `palette-${lang}.png`);
    execFileSync(FFMPEG, [...input, "-vf", "palettegen=max_colors=96:stats_mode=full:reserve_transparent=0", palette]);
    execFileSync(FFMPEG, [...input, "-i", palette, "-lavfi", "[0:v][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle", "-loop", "0", gif]);
    outputs.push({ path: gif, origin: { html: "demo.html", text: engineText } });
    report.push(`[${lang}] demo: ${n} frames, ${(duration / 1000).toFixed(1)} s at ${FPS} fps`);
  }
}

await browser.close();
report.forEach((l) => console.log(l));

// Provenance: embed the origin of every raster with impeccable (skipped with a warning when the CLI is not installed).
const IMPECCABLE = process.env.IMPECCABLE || join(homedir(), ".claude", "skills", "impeccable", "scripts", "impeccable");
mkdirSync(CACHE, { recursive: true });
for (const { path, origin } of outputs) {
  if (!existsSync(IMPECCABLE)) { console.warn("impeccable CLI not found: provenance not embedded"); break; }
  const txt = join(CACHE, "provenance.txt");
  writeFileSync(txt, `Rendered from docs/media/src/${origin.html} by docs/media/build.mjs (Playwright, deterministic, no image generation). Text from ${origin.text}. Demo data: synthetic user, not a real person or result.`);
  try { execFileSync("sh", [IMPECCABLE, "embed-prompt", path, "--prompt-file", txt], { stdio: "pipe" }); }
  catch (e) { console.warn(`provenance not embedded in ${relative(ROOT, path)}: ${String(e.stderr || e.message).trim().split("\n")[0]}`); }
}
for (const { path } of outputs) console.log(`${relative(ROOT, path)}  ${(statSync(path).size / 1024).toFixed(0)} KB`);
