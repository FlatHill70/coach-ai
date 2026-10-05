import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const HOME = process.env.COACH_HOME ?? join(homedir(), ".coach");
export const LB = 0.45359237;
export const DAY = 86400000;

export const paths = {
  home: HOME,
  profile: join(HOME, "profile.json"),
  goals: join(HOME, "goals.json"),
  journal: join(HOME, "journal.md"),
  customExercises: join(HOME, "exercises.custom.json"),
  imports: join(HOME, "imports"),
  logs: join(HOME, "logs"),
  workoutLog: join(HOME, "logs", "workouts.csv"),
  bodyLog: join(HOME, "logs", "body.csv"),
  foodLog: join(HOME, "logs", "food.csv"),
  state: join(HOME, ".state.json"),
};

export class UserError extends Error {}

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [key, inline] = a.slice(2).split(/=(.*)/s);
      const next = argv[i + 1];
      if (inline !== undefined) out[key] = inline;
      else if (next === undefined || next.startsWith("--")) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

export function detectDelimiter(firstLine) {
  const count = (ch) => firstLine.split(ch).length - 1;
  return [",", ";", "\t"].sort((a, b) => count(b) - count(a))[0];
}

export function parseCsv(text, delimiter) {
  text = text.replace(/^﻿/, "");
  const nl = text.indexOf("\n");
  const delim = delimiter ?? detectDelimiter(nl < 0 ? text : text.slice(0, nl));
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { header: [], records: [] };
  const header = rows.shift().map((h) => h.trim());
  return { header, records: rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]))) };
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function appendCsv(file, header, rows) {
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) writeFileSync(file, header.map(csvCell).join(",") + "\n");
  appendFileSync(file, rows.map((r) => header.map((h) => csvCell(r[h])).join(",")).join("\n") + "\n");
}

export function readCsvFile(file) {
  return existsSync(file) ? parseCsv(readFileSync(file, "utf8")) : { header: [], records: [] };
}

export const num = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
export const round = (v, d = 1) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => (process.env.COACH_TODAY ? new Date(`${process.env.COACH_TODAY}T12:00:00`) : new Date());
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const parseDay = (s) => (s instanceof Date ? s : new Date(`${s}T12:00:00`));

export function weekKey(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return isoDay(x);
}

export function slopePerDay(points) {
  if (points.length < 2) return null;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const mx = mean(xs), my = mean(ys);
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  return den ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / den : null;
}

export function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, "")); }
  catch (e) { throw new UserError(`Invalid JSON in ${file}: ${e.message}`); }
}

export function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function loadProfile() {
  return readJson(paths.profile, null);
}

export function ageOf(profile, on = today()) {
  if (!profile) return null;
  if (profile.birth_date) {
    const b = parseDay(profile.birth_date);
    let age = on.getFullYear() - b.getFullYear();
    if (on.getMonth() < b.getMonth() || (on.getMonth() === b.getMonth() && on.getDate() < b.getDate())) age--;
    return age;
  }
  return profile.age ?? null;
}

export function unitOf(profile) {
  return profile?.units === "lb" ? "lb" : "kg";
}

export function toUnit(kg, unit, d = 1) {
  if (kg == null) return null;
  return round(unit === "lb" ? kg / LB : kg, d);
}

export function walk(dir, depth = 2) {
  if (!dir || !existsSync(dir) || depth < 0) return [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return entries.flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p, depth - 1);
    try { return [{ path: p, name: e.name, mtime: statSync(p).mtime }]; } catch { return []; }
  });
}

export function firstBytes(path, n = 4096) {
  try { return readFileSync(path).subarray(0, n).toString("utf8"); } catch { return ""; }
}

export const newest = (files) => [...files].sort((a, b) => b.mtime - a.mtime)[0] ?? null;

export function inboxDirs(profile) {
  const fromEnv = process.env.COACH_INBOX?.split(/[;|]/).filter(Boolean) ?? [];
  const fromProfile = [profile?.inbox].flat().filter(Boolean).map((p) => p.replace(/^~(?=$|[\\/])/, homedir()));
  return [...new Set([...fromEnv, ...fromProfile])];
}
