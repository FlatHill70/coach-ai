import {
  paths, appendCsv, readCsvFile, num, round, mean, isoDay, today, daysBetween, DAY,
  loadProfile, ageOf, UserError,
} from "./common.mjs";
import { healthRows } from "./health.mjs";
import { dailyWeights, weightTrend } from "./body.mjs";

export const FOOD_HEADER = ["date", "time", "meal", "description", "kcal", "protein_g", "carbs_g", "fat_g", "fiber_g", "source"];
const KCAL_PER_KG = 7700;
const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extreme: 1.9 };

const GOAL_RATE = {
  fat_loss: { novice: [-0.75, -0.5], beginner: [-0.75, -0.5], intermediate: [-0.7, -0.4], advanced: [-0.6, -0.3], elite: [-0.5, -0.25] },
  muscle_gain: { novice: [0.25, 0.5], beginner: [0.25, 0.5], intermediate: [0.15, 0.35], advanced: [0.1, 0.25], elite: [0.05, 0.2] },
  strength: { default: [0, 0.25] },
  recomp: { default: [0, 0] },
  maintenance: { default: [0, 0] },
  general_health: { default: [0, 0] },
  endurance: { default: [0, 0] },
  performance: { default: [0, 0] },
};

const PROTEIN = {
  fat_loss: [1.8, 2.4], muscle_gain: [1.6, 2.2], recomp: [1.8, 2.4], strength: [1.6, 2.2],
  maintenance: [1.4, 1.8], general_health: [1.2, 1.8], endurance: [1.4, 1.8], performance: [1.6, 2.0],
};

export function mifflin({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "female" ? base - 161 : sex === "male" ? base + 5 : base - 78;
}

export const katch = (weightKg, bodyfatPct) => 370 + 21.6 * weightKg * (1 - bodyfatPct / 100);

function activityFactor(profile) {
  if (ACTIVITY[profile.activity]) return { factor: ACTIVITY[profile.activity], from: `activity: ${profile.activity}` };
  const days = Number(profile.training_days ?? 3);
  const steps = Number(profile.daily_steps ?? 0);
  let f = days <= 1 ? 1.3 : days <= 3 ? 1.4 : days <= 5 ? 1.55 : 1.7;
  if (steps >= 10000) f += 0.1;
  else if (steps && steps < 5000) f -= 0.05;
  return { factor: round(f, 3), from: `${days} training days/week${steps ? `, ~${steps} steps/day` : ""}` };
}

export async function computeTargets(profile, overrides = {}) {
  if (!profile) throw new UserError("No profile yet: run onboarding first (profile.json).");
  const p = { ...profile, ...overrides };
  const age = ageOf(p);
  const weights = await dailyWeights();
  const weightKg = num(overrides.weight) ?? weights.at(-1)?.value ?? p.weight_kg;
  const heightCm = p.height_cm;
  const missing = [["sex", p.sex], ["age or birth_date", age], ["height_cm", heightCm], ["weight", weightKg]].filter(([, v]) => v == null).map(([k]) => k);
  if (missing.length) throw new UserError(`Profile is missing: ${missing.join(", ")}`);

  const flags = [];
  let goal = p.goal ?? "general_health";
  const level = p.level ?? "beginner";
  const bmi = weightKg / (heightCm / 100) ** 2;
  if (age < 18) flags.push("adolescent: growth needs energy. No calorie deficit is prescribed; focus on food quality, enough protein and sleep.");
  if (age < 18 && goal === "fat_loss") { goal = "maintenance"; flags.push("fat_loss goal mapped to maintenance + habits because the user is under 18."); }
  if (p.pregnant || p.breastfeeding) { flags.push("pregnancy/breastfeeding: no deficit; targets must be confirmed by their midwife/doctor/dietitian."); if (goal === "fat_loss") goal = "maintenance"; }
  if (bmi < 18.5 && goal === "fat_loss") { goal = "maintenance"; flags.push(`BMI ${round(bmi)} is underweight: weight loss is not recommended; refer to a professional.`); }
  if (p.screening?.eating_disorder) flags.push("eating-disorder history: do not prescribe deficits or detailed tracking without their clinician; prefer habit-based guidance.");

  const bodyfat = p.bodyfat_pct ?? null;
  const bmrM = mifflin({ sex: p.sex, weightKg, heightCm, age });
  const bmrK = bodyfat ? katch(weightKg, bodyfat) : null;
  const bmr = bmrK ? (bmrM + bmrK) / 2 : bmrM;
  const act = activityFactor(p);
  const formulaTdee = bmr * act.factor;
  const adaptive = await adaptiveTdee();
  const tdee = adaptive?.confidence === "high" ? adaptive.tdee : adaptive?.confidence === "medium" ? (adaptive.tdee + formulaTdee) / 2 : formulaTdee;

  const rates = GOAL_RATE[goal] ?? GOAL_RATE.maintenance;
  let [rLo, rHi] = p.rate_pct_per_week != null ? [p.rate_pct_per_week, p.rate_pct_per_week] : rates[level] ?? rates.default ?? [0, 0];
  if (age < 18) { rLo = Math.max(0, rLo); rHi = Math.max(0, rHi); }
  const rate = (rLo + rHi) / 2;
  const delta = (rate / 100) * weightKg * KCAL_PER_KG / 7;
  let kcal = tdee + delta;
  const floor = Math.max(bmr * 1.05, p.sex === "female" ? 1200 : 1500);
  if (delta < 0 && -delta > tdee * 0.25) { kcal = tdee * 0.75; flags.push("deficit capped at 25% of maintenance."); }
  if (delta < 0 && kcal < floor) { kcal = Math.min(floor, tdee); flags.push(`calorie target raised to a floor of ${Math.round(kcal)} kcal — the requested rate was too aggressive.`); }

  const refWeight = bmi > 30 ? 27 * (heightCm / 100) ** 2 : weightKg;
  if (bmi > 30) flags.push(`protein is based on a reference weight of ${round(refWeight)} kg (BMI ${round(bmi)}), not total weight.`);
  let [pLo, pHi] = PROTEIN[goal] ?? PROTEIN.general_health;
  if (age < 18) [pLo, pHi] = [1.4, 2.0];
  const proteinG = [pLo * refWeight, pHi * refWeight];
  const fatG = Math.max(0.7 * weightKg, (kcal * 0.25) / 9);
  const proteinMid = (proteinG[0] + proteinG[1]) / 2;
  const carbsG = Math.max(0, (kcal - proteinMid * 4 - fatG * 9) / 4);
  if (goal === "endurance" && carbsG / weightKg < 5) flags.push(`carbohydrate is ${round(carbsG / weightKg)} g/kg; endurance training usually needs 5–7 g/kg on heavy days.`);
  const meals = Number(p.nutrition?.meals_per_day ?? p.meals_per_day ?? 4);

  return {
    goal, level, age, sex: p.sex, weightKg: round(weightKg, 1), heightCm, bmi: round(bmi, 1),
    bmr: { mifflinStJeor: Math.round(bmrM), katchMcArdle: bmrK ? Math.round(bmrK) : null, used: Math.round(bmr) },
    activity: act,
    maintenance: { formula: Math.round(formulaTdee), adaptive: adaptive ?? "not enough food + weight data yet (needs ~2 weeks of both)", used: Math.round(tdee) },
    targetRatePctPerWeek: [rLo, rHi],
    expectedChangeKgPerWeek: round((rate / 100) * weightKg, 2),
    calories: { target: Math.round(kcal / 10) * 10, range: [Math.round((kcal - 100) / 10) * 10, Math.round((kcal + 100) / 10) * 10] },
    macros: {
      protein_g: [Math.round(proteinG[0]), Math.round(proteinG[1])],
      fat_g_min: Math.round(fatG),
      carbs_g: Math.round(carbsG),
      fiber_g: Math.round((kcal / 1000) * 14),
      proteinPerMeal_g: Math.round(proteinMid / meals),
    },
    water_l: round((35 * weightKg) / 1000, 1),
    flags,
    note: "Formula maintenance is a starting guess (±10–15%). After 2–3 weeks, adjust from the real weight trend — the adaptive estimate takes over automatically.",
  };
}

async function foodRows() {
  const { rows } = await healthRows();
  const out = rows.filter((r) => ["kcal", "protein", "carbs", "fat_g"].includes(r.kind)).map((r) => ({ ...r }));
  for (const rec of readCsvFile(paths.foodLog).records) {
    const date = new Date(`${rec.date}T${rec.time || "12:00"}:00`);
    if (isNaN(date)) continue;
    for (const [col, kind] of [["kcal", "kcal"], ["protein_g", "protein"], ["carbs_g", "carbs"], ["fat_g", "fat_g"]]) {
      const v = num(rec[col]);
      if (v != null) out.push({ kind, date, value: v, source: "log" });
    }
  }
  return out;
}

export async function dailyFood(days = 28) {
  const end = today();
  const cutoff = isoDay(new Date(end.getTime() - days * DAY));
  const byDay = new Map();
  for (const r of await foodRows()) {
    const d = isoDay(r.date);
    if (d < cutoff || d > isoDay(end)) continue;
    const day = byDay.get(d) ?? { day: d, kcal: 0, protein: 0, carbs: 0, fat_g: 0, sources: new Set() };
    day[r.kind] += r.value;
    day.sources.add(r.source);
    byDay.set(d, day);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)).map((d) => ({ ...d, sources: [...d.sources] }));
}

export async function adaptiveTdee(windowDays = 28) {
  const food = (await dailyFood(windowDays)).filter((d) => d.day !== isoDay(today()));
  const typical = mean(food.map((d) => d.kcal));
  const logged = food.filter((d) => d.kcal > (typical ?? 0) * 0.6);
  const trend = weightTrend(await dailyWeights(), windowDays);
  if (logged.length < 10 || !trend || trend.weighIns < 8) return null;
  const intake = mean(logged.map((d) => d.kcal));
  const tdee = intake - (trend.kgPerWeek / 7) * KCAL_PER_KG;
  return {
    tdee: Math.round(tdee), avgIntake: Math.round(intake), loggedDays: logged.length, weighIns: trend.weighIns,
    weightChangeKgPerWeek: round(trend.kgPerWeek, 2),
    confidence: logged.length >= 21 && trend.weighIns >= 16 ? "high" : "medium",
  };
}

async function cmdDays(args) {
  const days = Number(args.days ?? 14);
  const profile = loadProfile();
  const list = await dailyFood(days);
  if (!list.length) return { error: "No food logged yet", hint: "Log meals with `nutrition log`, or connect a food app through Apple Health / Health Connect." };
  const weightKg = (await dailyWeights()).at(-1)?.value ?? profile?.weight_kg ?? null;
  let targets = null;
  try { targets = profile ? await computeTargets(profile) : null; } catch { targets = null; }
  const todayKey = isoDay(today());
  const typical = mean(list.filter((d) => d.day !== todayKey).map((d) => d.kcal)) ?? 0;
  const perDay = list.map((d) => ({
    day: d.day, kcal: Math.round(d.kcal), protein_g: Math.round(d.protein), carbs_g: Math.round(d.carbs), fat_g: Math.round(d.fat_g),
    protein_g_per_kg: weightKg ? round(d.protein / weightKg, 2) : null, sources: d.sources,
    ...(d.day === todayKey ? { note: "today, incomplete" } : d.kcal < typical * 0.6 ? { note: "probably not fully logged" } : {}),
  }));
  const complete = perDay.filter((d) => !d.note).slice(-7);
  const avg = (k, dec = 0) => round(mean(complete.map((d) => d[k]).filter((v) => v != null)), dec);
  return {
    note: "Daily totals of everything logged. Days marked 'probably not fully logged' are excluded from averages.",
    last7CompleteDays: { days: complete.length, kcal: avg("kcal"), protein_g: avg("protein_g"), carbs_g: avg("carbs_g"), fat_g: avg("fat_g"), protein_g_per_kg: avg("protein_g_per_kg", 2) },
    targets: targets && { kcal: targets.calories.target, protein_g: targets.macros.protein_g, fat_g_min: targets.macros.fat_g_min, carbs_g: targets.macros.carbs_g },
    perDay,
  };
}

function cmdLog(args) {
  const kcal = num(args.kcal), protein = num(args.protein);
  if (kcal == null && protein == null) throw new UserError('Usage: nutrition log --kcal 650 --protein 40 [--carbs 70] [--fat 20] [--fiber 8] [--meal lunch] [--desc "chicken rice bowl"] [--date YYYY-MM-DD] [--time HH:MM]');
  const row = {
    date: typeof args.date === "string" ? args.date : isoDay(today()), time: typeof args.time === "string" ? args.time : "",
    meal: typeof args.meal === "string" ? args.meal : "", description: typeof args.desc === "string" ? args.desc : "",
    kcal: kcal ?? "", protein_g: protein ?? "", carbs_g: num(args.carbs) ?? "", fat_g: num(args.fat) ?? "", fiber_g: num(args.fiber) ?? "", source: "chat",
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new UserError("--date must be YYYY-MM-DD");
  appendCsv(paths.foodLog, FOOD_HEADER, [row]);
  return { saved: row, file: paths.foodLog };
}

async function cmdTargets(args) {
  const overrides = {};
  for (const k of ["goal", "activity", "weight", "level"]) if (typeof args[k] === "string") overrides[k] = args[k];
  if (args.rate != null) overrides.rate_pct_per_week = num(args.rate);
  return computeTargets(loadProfile(), overrides);
}

async function cmdTdee() {
  return (await adaptiveTdee()) ?? { error: "Not enough data", needs: "≥10 fully logged days and ≥8 weigh-ins in the last 28 days" };
}

export async function cmdNutrition(args) {
  const sub = args._[0];
  const commands = { targets: cmdTargets, days: cmdDays, log: cmdLog, tdee: cmdTdee };
  if (!commands[sub]) throw new UserError(`Usage: nutrition <${Object.keys(commands).join("|")}>`);
  return commands[sub](args);
}
