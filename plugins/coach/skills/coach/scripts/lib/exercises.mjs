import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SKILL_DIR, paths, readJson, writeJson, UserError } from "./common.mjs";

export const MUSCLE_GROUPS = [
  "chest", "lats", "upper_back", "traps", "front_delts", "side_delts", "rear_delts",
  "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "adductors", "calves", "lower_back", "abs",
];

export const REGIONS = {
  push: ["chest", "front_delts", "triceps"],
  pull: ["lats", "upper_back", "rear_delts", "biceps"],
  legs: ["quads", "hamstrings", "glutes", "adductors", "calves"],
};

const BASE = JSON.parse(readFileSync(join(SKILL_DIR, "scripts", "exercises.json"), "utf8"));

let merged;
export function catalog() {
  if (!merged) merged = { ...BASE, ...readJson(paths.customExercises, {}) };
  return merged;
}

export const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export function entryFor(name) {
  const cat = catalog();
  if (cat[name]) return cat[name];
  const base = name.replace(/\s*\(.*\)\s*$/, "").trim();
  if (cat[base]) return cat[base];
  const n = norm(name);
  for (const [k, v] of Object.entries(cat)) {
    if (norm(k) === n || Object.values(v.name ?? {}).some((x) => norm(x) === n) || (v.aliases ?? []).some((a) => norm(a) === n)) return v;
  }
  return null;
}

export function displayName(name, lang = "en") {
  const e = entryFor(name);
  return e?.name?.[lang] ?? e?.name?.en ?? name;
}

export function musclesFor(name) {
  const e = entryFor(name);
  if (!e || e.cardio) return null;
  return { primary: e.primary ?? [], secondary: e.secondary ?? [] };
}

export const isCardio = (name) => Boolean(entryFor(name)?.cardio);
export const isBodyweight = (name) => Boolean(entryFor(name)?.bodyweight);

export function cmdExercises(args) {
  const sub = args._[1] ?? "list";
  if (sub === "groups") return { groups: MUSCLE_GROUPS, regions: REGIONS };
  if (sub === "find") {
    const q = norm(args._.slice(2).join(" "));
    if (!q) throw new UserError('Usage: exercises find "<text>"');
    const hits = Object.entries(catalog()).filter(([k, v]) => norm(k).includes(q) || Object.values(v.name ?? {}).some((x) => norm(x).includes(q)) || (v.aliases ?? []).some((a) => norm(a).includes(q)));
    return { query: q, matches: hits.slice(0, 30).map(([k, v]) => ({ key: k, ...v })) };
  }
  if (sub === "list") {
    const custom = readJson(paths.customExercises, {});
    return { base: Object.keys(BASE).length, custom: Object.keys(custom).length, customExercises: custom };
  }
  if (sub === "add") return addExercise(args);
  if (sub === "remove") {
    const key = args._[2];
    const custom = readJson(paths.customExercises, {});
    if (!custom[key]) throw new UserError(`"${key}" is not a custom exercise. Custom: ${Object.keys(custom).join(", ") || "none"}`);
    delete custom[key];
    writeJson(paths.customExercises, custom);
    return { removed: key };
  }
  throw new UserError("Usage: exercises <list|find|groups|add|remove>");
}

function splitGroups(v, flag) {
  if (!v || v === true) return [];
  const groups = String(v).split(",").map((s) => s.trim()).filter(Boolean);
  const bad = groups.filter((g) => !MUSCLE_GROUPS.includes(g));
  if (bad.length) throw new UserError(`Unknown muscle group in --${flag}: ${bad.join(", ")}. Valid: ${MUSCLE_GROUPS.join(", ")}`);
  return groups;
}

function addExercise(args) {
  const key = args._[2];
  if (!key) throw new UserError('Usage: exercises add "<name as logged>" --primary g1,g2 [--secondary g3] [--es "Nombre"] [--en "Name"] [--bodyweight] [--cardio] [--alias "a,b"]');
  const cardio = Boolean(args.cardio);
  const primary = splitGroups(args.primary, "primary");
  if (!cardio && !primary.length) throw new UserError("A strength exercise needs --primary (or pass --cardio)");
  const entry = { name: { en: typeof args.en === "string" ? args.en : key } };
  for (const [flag, value] of Object.entries(args)) if (/^[a-z]{2}$/.test(flag) && flag !== "en" && typeof value === "string") entry.name[flag] = value;
  if (cardio) entry.cardio = true;
  else {
    entry.primary = primary;
    const secondary = splitGroups(args.secondary, "secondary");
    if (secondary.length) entry.secondary = secondary;
  }
  if (args.bodyweight) entry.bodyweight = true;
  if (typeof args.alias === "string") entry.aliases = args.alias.split(",").map((s) => s.trim()).filter(Boolean);
  entry.custom = true;
  const custom = readJson(paths.customExercises, {});
  const existed = Boolean(custom[key] ?? BASE[key]);
  custom[key] = entry;
  writeJson(paths.customExercises, custom);
  merged = undefined;
  return { saved: key, entry, overridesExisting: existed, file: paths.customExercises };
}
