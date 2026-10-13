import {
  paths, appendCsv, readCsvFile, num, round, mean, isoDay, today, daysBetween, slopePerDay, LB, DAY,
  loadProfile, unitOf, toUnit, ageOf, UserError,
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

const BMI_CLASSES = [
  [16, "severe_thinness", "Severe thinness", "Delgadez severa"],
  [17, "moderate_thinness", "Moderate thinness", "Delgadez moderada"],
  [18.5, "underweight", "Underweight", "Bajo peso"],
  [25, "normal", "Normal weight", "Peso normal"],
  [30, "overweight", "Overweight", "Sobrepeso"],
  [35, "obese_1", "Obesity class I", "Obesidad grado I"],
  [40, "obese_2", "Obesity class II", "Obesidad grado II"],
  [Infinity, "obese_3", "Obesity class III", "Obesidad grado III"],
];

const BODY_TYPES = {
  thinness: ["Thinness", "Delgadez"],
  underweight: ["Underweight", "Bajo peso"],
  thin: ["Thin", "Delgado"],
  hidden_obese: ["Hidden obesity", "Obesidad oculta"],
  fit: ["Fit", "En forma"],
  thin_muscular: ["Lean and muscular", "Delgadez y buena forma muscular"],
  overweight: ["Overweight", "Con sobrepeso"],
  obese: ["Obese", "Obeso"],
  athletic: ["Athletic", "Atlético"],
  muscular: ["Muscular", "Musculoso"],
};

// Rows: body-fat band (high, healthy, low). Columns: BMI < 18.5, 18.5–25, 25–30, ≥ 30.
const BODY_TYPE_GRID = {
  high: ["hidden_obese", "hidden_obese", "overweight", "obese"],
  healthy: ["underweight", "fit", "athletic", "athletic"],
  low: ["thin", "thin_muscular", "muscular", "muscular"],
};

// Healthy body-fat ranges by sex and age (Gallagher et al. 2000, Am J Clin Nutr 72:694).
const FAT_RANGES = {
  male: [[40, 8, 20], [60, 11, 22], [Infinity, 13, 25]],
  female: [[40, 21, 33], [60, 23, 34], [Infinity, 24, 36]],
};

export function healthyFatRange(sex, age) {
  const pick = (s) => FAT_RANGES[s].find(([upTo]) => age < upTo).slice(1);
  if (sex === "male" || sex === "female") return pick(sex);
  const [m, f] = [pick("male"), pick("female")];
  return [(m[0] + f[0]) / 2, (m[1] + f[1]) / 2];
}

export function classifyBody({ weightKg, heightCm, bodyfatPct = null, sex = null, age = null }) {
  const bmi = weightKg / (heightCm / 100) ** 2;
  const bmiClass = BMI_CLASSES.find(([upTo]) => bmi < upTo);
  const out = { bmi: round(bmi, 1), bmiClass: { code: bmiClass[1], en: bmiClass[2], es: bmiClass[3] }, bodyfat: null, bodyType: null, flags: [] };
  if (age != null && age < 18) {
    out.bmiClass = null;
    out.flags.push("under 18: adult BMI cut-offs and body types don't apply; use WHO BMI-for-age percentiles.");
    return out;
  }
  const label = (code) => ({ code, en: BODY_TYPES[code][0], es: BODY_TYPES[code][1] });
  if (bmi < 17) {
    out.bodyType = label("thinness");
    out.flags.push(`BMI ${out.bmi} is below 17: health risk, refer to a doctor. No deficit, no body-composition goals.`);
  }
  if (bodyfatPct == null) return out;
  const [lo, hi] = healthyFatRange(sex, age ?? 30);
  const band = bodyfatPct < lo ? "low" : bodyfatPct > hi ? "high" : "healthy";
  out.bodyfat = { pct: round(bodyfatPct, 1), band, healthyRange: [round(lo, 1), round(hi, 1)] };
  if (sex !== "male" && sex !== "female") out.flags.push("sex not set: the healthy body-fat range is the average of the male and female ranges.");
  if (age == null) out.flags.push("age not set: body-fat range for ages 20–39 used.");
  if (!out.bodyType) out.bodyType = label(BODY_TYPE_GRID[band][bmi < 18.5 ? 0 : bmi < 25 ? 1 : bmi < 30 ? 2 : 3]);
  return out;
}

async function cmdBmi(args) {
  const profile = loadProfile();
  const unit = unitOf(profile);
  const { rows } = await healthRows();
  const lastWeight = firstPerDay(rows.filter((r) => r.kind === "weight")).at(-1);
  const lastFat = firstPerDay(rows.filter((r) => r.kind === "bodyfat")).at(-1);
  const end = today();
  const ago = (day) => daysBetween(new Date(`${day}T12:00:00`), end);

  let weightKg = null, weightFrom = null;
  if (num(args.weight) != null) [weightKg, weightFrom] = [unit === "lb" ? num(args.weight) * LB : num(args.weight), "argument"];
  else if (lastWeight) [weightKg, weightFrom] = [lastWeight.value, `weigh-in ${lastWeight.day}`];
  else if (profile?.weight_kg) [weightKg, weightFrom] = [profile.weight_kg, "profile"];
  const heightCm = num(args.height) ?? profile?.height_cm ?? null;
  let bodyfatPct = null, fatFrom = null;
  if (num(args.bodyfat) != null) [bodyfatPct, fatFrom] = [num(args.bodyfat), "argument"];
  else if (lastFat) [bodyfatPct, fatFrom] = [lastFat.value, `reading ${lastFat.day}`];
  else if (profile?.bodyfat_pct != null) [bodyfatPct, fatFrom] = [profile.bodyfat_pct, "profile"];
  const sex = typeof args.sex === "string" ? args.sex : profile?.sex ?? null;
  const age = num(args.age) ?? ageOf(profile);

  const missing = [["weight", weightKg], ["height_cm", heightCm]].filter(([, v]) => v == null).map(([k]) => k);
  if (missing.length) throw new UserError(`Missing ${missing.join(", ")}: pass --weight / --height or set them in the profile.`);

  const result = classifyBody({ weightKg, heightCm, bodyfatPct, sex, age });
  if (bodyfatPct == null) result.flags.push("no body-fat % yet: body type needs it (smart scale, `body log --bodyfat`, or --bodyfat).");
  if (fatFrom?.startsWith("reading") && ago(lastFat.day) > 60) result.flags.push(`body-fat reading is ${ago(lastFat.day)} days old.`);
  const lang = profile?.language === "es" ? "es" : "en";
  const m = heightCm / 100;
  return {
    inputs: { weight: toUnit(weightKg, unit, 1), unit, weightFrom, heightCm, bodyfatPct: round(bodyfatPct, 1), bodyfatFrom: fatFrom, sex, age },
    ...result,
    label: { bmiClass: result.bmiClass?.[lang] ?? null, bodyType: result.bodyType?.[lang] ?? null },
    healthyWeight: result.bmiClass ? { min: toUnit(18.5 * m * m, unit, 1), max: toUnit(24.9 * m * m, unit, 1), unit } : null,
    note: "BMI can't tell fat from muscle: the body type crosses it with body-fat %. Smart-scale body fat (bioimpedance) varies ±3–5 points with hydration; read it as a trend.",
  };
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
  const commands = { weight: cmdWeight, log: cmdLog, measures: cmdMeasures, bmi: cmdBmi, info: cmdInfo };
  if (!commands[sub]) throw new UserError(`Usage: body <${Object.keys(commands).join("|")}>`);
  return commands[sub](args);
}
