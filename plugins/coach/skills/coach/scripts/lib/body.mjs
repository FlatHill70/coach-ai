import {
  paths, appendCsv, readCsvFile, num, round, mean, isoDay, today, daysBetween, slopePerDay, LB, DAY,
  loadProfile, unitOf, toUnit, UserError,
} from "./common.mjs";
import { healthRows } from "./health.mjs";

export const BODY_HEADER = ["date", "time", "weight_kg", "bodyfat_pct", "lean_kg", "waist_cm", "hips_cm", "chest_cm", "arm_cm", "thigh_cm", "calf_cm", "neck_cm", "note"];
const MEASURES = ["waist_cm", "hips_cm", "chest_cm", "arm_cm", "thigh_cm", "calf_cm", "neck_cm"];

export function firstPerDay(rows) {
  const byDay = new Map();
  for (const r of rows) {
    const k = isoDay(r.date);
    if (!byDay.has(k)) byDay.set(k, { day: k, value: r.value, source: r.source });
  }
  return [...byDay.values()];
}

export async function dailyWeights() {
  const { rows } = await healthRows();
  return firstPerDay(rows.filter((r) => r.kind === "weight"));
}

export async function latestBodyweightKg() {
  return (await dailyWeights()).at(-1)?.value ?? loadProfile()?.weight_kg ?? null;
}

export function weightTrend(weights, days = 28) {
  const end = today();
  const recent = weights.filter((w) => daysBetween(new Date(`${w.day}T12:00:00`), end) <= days);
  if (recent.length < 4) return null;
  const slope = slopePerDay(recent.map((w) => ({ x: new Date(`${w.day}T12:00:00`).getTime() / DAY, y: w.value })));
  const avg = mean(recent.map((w) => w.value));
  return { kgPerWeek: slope * 7, pctPerWeek: (slope * 7 / avg) * 100, weighIns: recent.length, avgKg: avg, days };
}

async function cmdWeight(args) {
  const profile = loadProfile();
  const unit = unitOf(profile);
  const days = Number(args.days ?? 42);
  const weights = await dailyWeights();
  if (!weights.length) return { error: "No weigh-ins yet", hint: "Log one with `body log --weight 72.4`, or connect the iOS Shortcut / Health Connect (see references/data-sources.md)." };
  const { rows } = await healthRows();
  const fat = firstPerDay(rows.filter((r) => r.kind === "bodyfat"));
  const lean = firstPerDay(rows.filter((r) => r.kind === "lean"));
  const end = today();
  const cutoff = isoDay(new Date(end.getTime() - days * DAY));
  const weeks = [];
  for (let e = end; ; e = new Date(e.getTime() - 7 * DAY)) {
    const to = isoDay(e), from = isoDay(new Date(e.getTime() - 6 * DAY));
    if (to < cutoff) break;
    const vals = weights.filter((w) => w.day >= from && w.day <= to).map((w) => w.value);
    const fats = fat.filter((w) => w.day >= from && w.day <= to).map((w) => w.value);
    weeks.unshift({ from, to, weighIns: vals.length, avg: toUnit(mean(vals), unit, 2), bodyfatPct: round(mean(fats)) , _kg: mean(vals) });
  }
  const rates = [];
  for (let i = 1; i < weeks.length; i++) {
    const a = weeks[i - 1]._kg, b = weeks[i]._kg;
    if (a && b) rates.push({ weekEnding: weeks[i].to, change: toUnit(b - a, unit, 2), pct: round(((b - a) / a) * 100, 2) });
  }
  const last = weights.at(-1);
  const trend = weightTrend(weights, 28);
  return {
    unit,
    lastWeighIn: { day: last.day, value: toUnit(last.value, unit, 2), daysAgo: daysBetween(new Date(`${last.day}T12:00:00`), end), source: last.source },
    note: "7-day windows ending today, first weigh-in of each day. Judge trends, never a single day.",
    weeks: weeks.map(({ _kg, ...w }) => w),
    weeklyChange: rates,
    trend28Days: trend && { perWeek: toUnit(trend.kgPerWeek, unit, 2), pctPerWeek: round(trend.pctPerWeek, 2), weighIns: trend.weighIns },
    composition: {
      bodyfatPct: fat.filter((f) => f.day >= cutoff).map((f) => ({ day: f.day, pct: round(f.value) })),
      lean: lean.filter((f) => f.day >= cutoff).map((f) => ({ day: f.day, value: toUnit(f.value, unit, 2) })),
    },
    weighIns: weights.filter((w) => w.day >= cutoff).map((w) => ({ day: w.day, value: toUnit(w.value, unit, 2) })),
  };
}

function cmdLog(args) {
  const profile = loadProfile();
  const unit = args.unit ?? unitOf(profile);
  const row = { date: typeof args.date === "string" ? args.date : isoDay(today()), time: typeof args.time === "string" ? args.time : "", note: typeof args.note === "string" ? args.note : "" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new UserError("--date must be YYYY-MM-DD");
  const w = num(args.weight);
  if (w != null) row.weight_kg = round(unit === "lb" ? w * LB : w, 2);
  if (num(args.bodyfat) != null) row.bodyfat_pct = num(args.bodyfat);
  if (num(args.lean) != null) row.lean_kg = round(unit === "lb" ? num(args.lean) * LB : num(args.lean), 2);
  const lengthUnit = args["length-unit"] === "in" || (profile?.units === "lb" && args["length-unit"] !== "cm") ? "in" : "cm";
  for (const m of MEASURES) {
    const v = num(args[m.replace("_cm", "")]);
    if (v != null) row[m] = round(lengthUnit === "in" ? v * 2.54 : v, 1);
  }
  if (Object.keys(row).filter((k) => !["date", "time", "note"].includes(k)).length === 0) throw new UserError("Usage: body log [--weight 72.4] [--bodyfat 18] [--waist 81] [--hips] [--chest] [--arm] [--thigh] [--calf] [--neck] [--date YYYY-MM-DD] [--note]");
  appendCsv(paths.bodyLog, BODY_HEADER, [row]);
  return { saved: row, file: paths.bodyLog };
}

function cmdMeasures(args) {
  const profile = loadProfile();
  const inches = profile?.units === "lb";
  const records = readCsvFile(paths.bodyLog).records.filter((r) => MEASURES.some((m) => r[m]));
  if (!records.length) return { error: "No measurements logged", hint: "body log --waist 81 --arm 34 ..." };
  const out = {};
  for (const m of MEASURES) {
    const series = records.filter((r) => num(r[m]) != null).map((r) => ({ date: r.date, value: round(inches ? num(r[m]) / 2.54 : num(r[m]), 1) }));
    if (!series.length) continue;
    const first = series[0], last = series.at(-1);
    out[m.replace("_cm", "")] = { first, last, change: round(last.value - first.value, 1), entries: series.slice(-Number(args.last ?? 8)) };
  }
  return { unit: inches ? "in" : "cm", note: "Measure same time of day, relaxed, same tape position. Compare over 4+ weeks.", measures: out };
}

async function cmdInfo() {
  const h = await healthRows();
  const kinds = {};
  for (const r of h.rows) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
  return {
    rowsByKind: kinds,
    shortcut: h.shortcut ? { ...h.shortcut, hoursSinceUpdate: h.shortcut.modified ? round((Date.now() - h.shortcut.modified) / 3600000) : null } : "no iOS Shortcut file found in the inbox",
    healthConnect: h.healthConnect ?? "no Health Connect export imported",
    bodyLog: paths.bodyLog,
  };
}

export async function cmdBody(args) {
  const sub = args._[0];
  const commands = { weight: cmdWeight, log: cmdLog, measures: cmdMeasures, info: cmdInfo };
  if (!commands[sub]) throw new UserError(`Usage: body <${Object.keys(commands).join("|")}>`);
  return commands[sub](args);
}
