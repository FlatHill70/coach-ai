import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { paths, loadProfile, inboxDirs, walk, newest, num, readCsvFile, LB, UserError } from "./common.mjs";

export const SHORTCUT_RE = /^(coach_health|coach-health|salud_atajo|entrenador).*\.txt$/i;
export const HC_DB = () => join(paths.imports, "health_connect.db");

const KIND_ALIASES = {
  weight: "weight", peso: "weight", bodymass: "weight",
  bodyfat: "bodyfat", body_fat: "bodyfat", grasa: "bodyfat", fatpct: "bodyfat",
  lean: "lean", magra: "lean", leanbodymass: "lean",
  kcal: "kcal", energy: "kcal", calories: "kcal", energia: "kcal",
  protein: "protein", proteina: "protein",
  carbs: "carbs", carbohidratos: "carbs", hidratos: "carbs",
  fat_g: "fat_g", dietary_fat: "fat_g", grasas: "fat_g",
  steps: "steps", pasos: "steps",
  sleep_h: "sleep_h", sueno: "sleep_h", sleep: "sleep_h",
};

const KJ_PER_KCAL = 4.184;

function normaliseValue(kind, value, unit) {
  const u = (unit || "").toLowerCase();
  if (kind === "weight" || kind === "lean") return /lb/.test(u) ? value * LB : /^g$/.test(u) ? value / 1000 : value;
  if (kind === "bodyfat") return value <= 1 ? value * 100 : value;
  if (kind === "kcal") return /kj/.test(u) ? value / KJ_PER_KCAL : value;
  if (["protein", "carbs", "fat_g"].includes(kind)) return /^mg$/.test(u) ? value / 1000 : value;
  if (kind === "sleep_h") return /min/.test(u) ? value / 60 : /^s/.test(u) ? value / 3600 : value;
  return value;
}

export function parseShortcutText(text, source = "apple_health") {
  const rows = [], bad = [];
  for (const line of text.replace(/^﻿/, "").split(/\r?\n/)) {
    if (!line.trim() || /^info;/i.test(line)) continue;
    const [rawKind, date, raw, unit = ""] = line.split(";").map((s) => s.trim());
    const kind = KIND_ALIASES[rawKind?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "")];
    const d = new Date(date);
    const value = Number(String(raw ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.eE-]/g, ""));
    if (!kind || isNaN(d) || raw === "" || !Number.isFinite(value)) { if (bad.length < 5) bad.push(line); continue; }
    rows.push({ kind, date: d, value: normaliseValue(kind, value, unit), source });
  }
  return { rows, bad };
}

export function shortcutFile(profile = loadProfile()) {
  const live = newest(inboxDirs(profile).flatMap((d) => walk(d, 2)).filter((f) => SHORTCUT_RE.test(f.name)));
  if (live) return live;
  const copy = join(paths.imports, "apple_health.txt");
  return existsSync(copy) ? { path: copy, name: "apple_health.txt", mtime: null } : null;
}

const HC_TABLES = {
  weight: { table: /^weight_record_table$/, value: ["weight"], unit: "grams_or_kg" },
  bodyfat: { table: /^body_fat_record_table$/, value: ["percentage"], unit: "pct" },
  lean: { table: /^lean_body_mass_record_table$/, value: ["mass"], unit: "grams_or_kg" },
  steps: { table: /^steps_record_table$/, value: ["count"], unit: "count" },
  kcal: { table: /^nutrition_record_table$/, value: ["energy"], unit: "energy" },
  protein: { table: /^nutrition_record_table$/, value: ["protein"], unit: "grams" },
  carbs: { table: /^nutrition_record_table$/, value: ["total_carbohydrate", "carbohydrate"], unit: "grams" },
  fat_g: { table: /^nutrition_record_table$/, value: ["total_fat", "fat"], unit: "grams" },
};
const TIME_COLS = ["time", "start_time", "local_date_time", "local_date_time_start_time"];

export async function readHealthConnect(file = HC_DB()) {
  if (!existsSync(file)) return { rows: [], schema: null };
  let DatabaseSync;
  try { ({ DatabaseSync } = await import("node:sqlite")); }
  catch { throw new UserError("Reading Health Connect exports needs Node.js 22.13+ (node:sqlite). Update Node or use the manual body log."); }
  const db = new DatabaseSync(file, { readOnly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name);
  const rows = [], schema = {};
  for (const [kind, spec] of Object.entries(HC_TABLES)) {
    const table = tables.find((t) => spec.table.test(t));
    if (!table) continue;
    const cols = db.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name);
    const valueCol = spec.value.find((c) => cols.includes(c));
    const timeCol = TIME_COLS.find((c) => cols.includes(c));
    schema[kind] = { table, valueCol, timeCol };
    if (!valueCol || !timeCol) continue;
    const raw = db.prepare(`SELECT "${timeCol}" AS t, "${valueCol}" AS v FROM "${table}" WHERE "${valueCol}" IS NOT NULL`).all();
    for (const r of raw) {
      let v = Number(r.v);
      if (!Number.isFinite(v)) continue;
      if (spec.unit === "grams_or_kg" && v > 500) v /= 1000;
      if (spec.unit === "energy" && v > 20000) v /= 1000;
      const t = Number(r.t);
      const date = new Date(t > 1e12 ? t : t * 1000);
      if (!isNaN(date)) rows.push({ kind, date, value: v, source: "health_connect" });
    }
  }
  db.close();
  return { rows, schema, tables: tables.length };
}

const BODY_LOG_KINDS = { weight_kg: "weight", bodyfat_pct: "bodyfat", lean_kg: "lean" };

function readBodyLog() {
  const rows = [];
  for (const rec of readCsvFile(paths.bodyLog).records) {
    const date = new Date(`${rec.date}T${rec.time || "07:00"}:00`);
    if (isNaN(date)) continue;
    for (const [col, kind] of Object.entries(BODY_LOG_KINDS)) {
      const v = num(rec[col]);
      if (v != null) rows.push({ kind, date, value: v, source: "log" });
    }
  }
  return rows;
}

let cache;
export async function healthRows() {
  if (cache) return cache;
  const profile = loadProfile();
  const file = shortcutFile(profile);
  const shortcut = file ? parseShortcutText(readFileSync(file.path, "utf8")) : { rows: [], bad: [] };
  const hc = await readHealthConnect();
  cache = {
    rows: [...shortcut.rows, ...hc.rows, ...readBodyLog()].sort((a, b) => a.date - b.date),
    shortcut: file && { file: file.path, modified: file.mtime, rows: shortcut.rows.length, unreadLines: shortcut.bad },
    healthConnect: hc.schema && { file: HC_DB(), rows: hc.rows.length, schema: hc.schema },
  };
  return cache;
}

export function resetHealthCache() { cache = undefined; }
