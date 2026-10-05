import { randomUUID } from "node:crypto";
import { paths, readJson, writeJson, readCsvFile, num, round, mean, isoDay, today, daysBetween, slopePerDay, DAY, LB, loadProfile, unitOf, toUnit, UserError } from "./common.mjs";
import { loadWorkouts, sessionsByExercise, findExercise, groupWorkouts } from "./workouts.mjs";
import { displayName } from "./exercises.mjs";
import { dailyWeights, weightTrend, firstPerDay } from "./body.mjs";
import { healthRows } from "./health.mjs";

const TYPES = ["lift", "reps", "bodyweight", "bodyfat", "measure", "sessions", "custom"];

async function currentValue(goal, ctx) {
  const unit = ctx.unit;
  if (goal.type === "lift" || goal.type === "reps") {
    const sessions = (ctx.hist.get(goal.exercise) ?? []).filter((s) => s.rawScore != null);
    const recent = sessions.filter((s) => daysBetween(s.when, today()) <= 28);
    if (!recent.length) return { value: null, note: "no sessions of this exercise in the last 28 days" };
    const fits = (s) => (goal.type === "lift" ? s.metric === "e1rm" : s.metric === "reps" || s.metric === "reps_assisted");
    const pick = recent.filter(fits);
    if (!pick.length) return { value: null, note: goal.type === "lift" ? "no loaded sets recently (e1RM needs weight × reps)" : "no reps-only sets recently" };
    const best = Math.max(...pick.map((s) => s.rawScore));
    const eight = sessions.filter((s) => fits(s) && daysBetween(s.when, today()) <= 56);
    const slope = slopePerDay(eight.map((s) => ({ x: s.when.getTime() / DAY, y: s.rawScore })));
    const value = goal.type === "lift" ? toUnit(best, unit) : best;
    return { value, perWeek: slope == null ? null : goal.type === "lift" ? toUnit(slope * 7, unit, 2) : round(slope * 7, 2) };
  }
  if (goal.type === "bodyweight") {
    const w = ctx.weights;
    const last7 = w.filter((x) => daysBetween(new Date(`${x.day}T12:00:00`), today()) <= 6).map((x) => x.value);
    const t = weightTrend(w, 28);
    return { value: last7.length ? toUnit(mean(last7), unit, 1) : null, perWeek: t ? toUnit(t.kgPerWeek, unit, 2) : null };
  }
  if (goal.type === "bodyfat") {
    const f = firstPerDay((await healthRows()).rows.filter((r) => r.kind === "bodyfat"));
    const recent = f.filter((x) => daysBetween(new Date(`${x.day}T12:00:00`), today()) <= 14).map((x) => x.value);
    const pts = f.filter((x) => daysBetween(new Date(`${x.day}T12:00:00`), today()) <= 56).map((x) => ({ x: new Date(`${x.day}T12:00:00`).getTime() / DAY, y: x.value }));
    const s = slopePerDay(pts);
    return { value: recent.length ? round(mean(recent), 1) : null, perWeek: s == null || pts.length < 6 ? null : round(s * 7, 2) };
  }
  if (goal.type === "measure") {
    const col = `${goal.measure}_cm`;
    const rows = readCsvFile(paths.bodyLog).records.filter((r) => num(r[col]) != null);
    if (!rows.length) return { value: null };
    const inches = ctx.unit === "lb";
    const conv = (v) => round(inches ? v / 2.54 : v, 1);
    const pts = rows.map((r) => ({ x: new Date(`${r.date}T12:00:00`).getTime() / DAY, y: num(r[col]) }));
    const s = slopePerDay(pts.slice(-8));
    return { value: conv(num(rows.at(-1)[col])), perWeek: s == null || pts.length < 3 ? null : conv(s * 7) };
  }
  if (goal.type === "sessions") {
    const since = new Date(today().getTime() - 28 * DAY);
    const n = groupWorkouts(ctx.sets).filter((w) => w.start >= since).length;
    return { value: round(n / 4, 1), perWeek: null };
  }
  return { value: goal.current ?? null, perWeek: null };
}

function assess(goal, cur) {
  const { start, target } = goal;
  const value = cur.value;
  if (value == null || target == null) return {};
  const dir = start != null && start !== target ? Math.sign(target - start) : Math.sign(target - value) || 1;
  const done = dir > 0 ? value >= target : value <= target;
  const progressPct = start != null && start !== target ? round(Math.max(0, Math.min(100, ((value - start) / (target - start)) * 100)), 0) : null;
  const remaining = round(target - value, 2);
  let eta = null, onTrack = null;
  if (!done && cur.perWeek && Math.sign(cur.perWeek) === dir) {
    const weeks = Math.abs(remaining / cur.perWeek);
    eta = isoDay(new Date(today().getTime() + weeks * 7 * DAY));
    if (goal.by) onTrack = eta <= goal.by;
  } else if (!done && goal.by) onTrack = false;
  return { done, progressPct, remaining, eta, onTrack, movingTheRightWay: cur.perWeek == null ? null : Math.sign(cur.perWeek) === dir };
}

async function context() {
  const data = loadWorkouts();
  return { ...data, hist: sessionsByExercise(data.sets, data.unit), weights: await dailyWeights() };
}

async function cmdAdd(args) {
  const type = args.type;
  if (!TYPES.includes(type)) throw new UserError(`Usage: goals add --type <${TYPES.join("|")}> --target N [--exercise "<name>"] [--measure waist|hips|chest|arm|thigh|calf|neck] [--by YYYY-MM-DD] [--title "..."]`);
  const goal = { id: randomUUID().slice(0, 8), type, title: typeof args.title === "string" ? args.title : null, target: num(args.target), by: typeof args.by === "string" ? args.by : null, created: isoDay(today()) };
  if (type !== "custom" && goal.target == null) throw new UserError("--target is required");
  const ctx = await context();
  if (type === "lift" || type === "reps") {
    if (!args.exercise) throw new UserError("--exercise is required for lift/reps goals");
    const match = findExercise([...ctx.hist.keys()], String(args.exercise), ctx.lang);
    goal.exercise = typeof match === "string" ? match : String(args.exercise);
    if (typeof match !== "string") goal.note = "exercise not found in history yet; progress appears once it is logged";
  }
  if (type === "measure") {
    if (!args.measure) throw new UserError("--measure is required (waist, hips, chest, arm, thigh, calf, neck)");
    goal.measure = String(args.measure);
  }
  goal.unit = type === "lift" || type === "bodyweight" ? ctx.unit : type === "measure" ? (ctx.unit === "lb" ? "in" : "cm") : type === "bodyfat" ? "%" : type === "sessions" ? "sessions/week" : type === "reps" ? "reps" : null;
  goal.start = (await currentValue(goal, ctx)).value;
  goal.title ??= type === "lift" ? `${displayName(goal.exercise, ctx.lang)} ${goal.target} ${goal.unit} (e1RM)` : type === "reps" ? `${displayName(goal.exercise, ctx.lang)} × ${goal.target}` : `${type} → ${goal.target}${goal.unit ? " " + goal.unit : ""}`;
  const goals = readJson(paths.goals, []);
  goals.push(goal);
  writeJson(paths.goals, goals);
  return { added: goal };
}

async function cmdProgress() {
  const goals = readJson(paths.goals, []);
  if (!goals.length) return { goals: [], hint: "No goals yet. Add one with `goals add`." };
  const ctx = await context();
  const out = [];
  for (const g of goals.filter((x) => !x.archived)) {
    const cur = await currentValue(g, ctx);
    out.push({ id: g.id, title: g.title, type: g.type, unit: g.unit, start: g.start, current: cur.value, target: g.target, by: g.by, trendPerWeek: cur.perWeek, ...assess(g, cur), note: cur.note ?? g.note });
  }
  return { asOf: isoDay(today()), goals: out };
}

function cmdUpdate(args) {
  const goals = readJson(paths.goals, []);
  const g = goals.find((x) => x.id === args._[1]);
  if (!g) throw new UserError(`No goal with id ${args._[1]}. Ids: ${goals.map((x) => x.id).join(", ")}`);
  for (const k of ["title", "by"]) if (typeof args[k] === "string") g[k] = args[k];
  if (args.target != null) g.target = num(args.target);
  if (args.current != null) g.current = num(args.current);
  if (args.archive) { g.archived = true; g.archivedOn = isoDay(today()); }
  writeJson(paths.goals, goals);
  return { updated: g };
}

export async function cmdGoals(args) {
  const sub = args._[0] ?? "progress";
  if (sub === "add") return cmdAdd(args);
  if (sub === "progress" || sub === "list") return cmdProgress();
  if (sub === "update") return cmdUpdate(args);
  throw new UserError("Usage: goals <progress|add|update>");
}
