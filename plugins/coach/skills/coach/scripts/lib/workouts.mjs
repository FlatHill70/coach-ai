import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  paths, parseCsv, appendCsv, num, round, mean, isoDay, weekKey, today, daysBetween, slopePerDay, LB, DAY,
  loadProfile, unitOf, toUnit, UserError,
} from "./common.mjs";
import { entryFor, displayName, musclesFor, isCardio, MUSCLE_GROUPS, REGIONS } from "./exercises.mjs";
import { latestBodyweightKg } from "./body.mjs";

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  ene: 0, abr: 3, ago: 7, set: 8, dic: 11, fév: 1, fev: 1, avr: 3, mai: 4, juin: 5, juil: 6, aoû: 7, aou: 7, déc: 11,
  gen: 0, mag: 4, giu: 5, lug: 6, ott: 9, okt: 9, mär: 2, mrz: 2, dez: 11, out: 9,
};

export const LOG_HEADER = ["title", "start_time", "end_time", "exercise_title", "set_index", "set_type", "weight_kg", "reps", "distance_km", "duration_seconds", "rpe", "notes", "source"];

export function parseDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  const m = t.match(/^(\d{1,2})\s+([^\s\d.,]{3,})\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const key = m[2].toLowerCase().normalize("NFC");
    const mon = MONTHS[key.slice(0, 4)] ?? MONTHS[key.slice(0, 3)];
    if (mon !== undefined) return new Date(+m[3], mon, +m[1], +m[4], +m[5]);
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] ?? 12), +(iso[5] ?? 0), +(iso[6] ?? 0));
  const d = new Date(t);
  return isNaN(d) ? null : d;
}

function parseDuration(s) {
  if (!s) return null;
  const h = /(\d+)\s*h/.exec(s)?.[1] ?? 0, mi = /(\d+)\s*m(?!s)/.exec(s)?.[1] ?? 0, se = /(\d+)\s*s/.exec(s)?.[1] ?? 0;
  const total = (+h * 3600 + +mi * 60 + +se) * 1000;
  return total || null;
}

export function detectFormat(header) {
  if (header.includes("exercise_title") && header.includes("start_time")) return "hevy";
  if (header.includes("Exercise Name") && header.includes("Set Order")) return "strong";
  return null;
}

function fromHevy(records, header, source) {
  const weightCol = header.includes("weight_kg") ? "weight_kg" : header.includes("weight_lbs") ? "weight_lbs" : null;
  if (!weightCol) throw new UserError(`Hevy CSV without weight_kg/weight_lbs column. Header: ${header.join(", ")}`);
  const sets = [], badDates = new Set();
  for (const r of records) {
    const start = parseDate(r.start_time);
    if (!start) { badDates.add(r.start_time); continue; }
    let kg = num(r[weightCol]);
    if (kg != null && weightCol === "weight_lbs") kg *= LB;
    sets.push({
      workout: `${source}|${r.start_time}|${r.title}`, title: r.title || "Workout", start, end: parseDate(r.end_time),
      exercise: r.exercise_title, type: (r.set_type || "normal").toLowerCase(), kg, reps: num(r.reps),
      rpe: num(r.rpe), seconds: num(r.duration_seconds), km: num(r.distance_km), source,
    });
  }
  return { sets, badDates: [...badDates] };
}

function fromStrong(records, header, source, unit) {
  const sets = [], badDates = new Set();
  const factor = unit === "lb" ? LB : 1;
  for (const r of records) {
    const order = String(r["Set Order"] ?? "").trim();
    if (/rest/i.test(order) || /rest timer/i.test(r["Exercise Name"])) continue;
    const start = parseDate(r.Date);
    if (!start) { badDates.add(r.Date); continue; }
    const dur = parseDuration(r.Duration);
    const kg = num(r.Weight);
    const type = /^w/i.test(order) ? "warmup" : /^d/i.test(order) ? "dropset" : /^f/i.test(order) ? "failure" : "normal";
    sets.push({
      workout: `${source}|${r.Date}|${r["Workout Name"]}`, title: r["Workout Name"] || "Workout", start,
      end: dur ? new Date(start.getTime() + dur) : null, exercise: r["Exercise Name"], type,
      kg: kg ? kg * factor : kg, reps: num(r.Reps), rpe: num(r.RPE), seconds: num(r.Seconds), km: num(r.Distance), source,
    });
  }
  return { sets, badDates: [...badDates] };
}

export function parseWorkoutCsv(text, { source = "csv", strongUnit = "kg" } = {}) {
  const { header, records } = parseCsv(text);
  const format = detectFormat(header);
  if (format === "hevy") return { format, header, ...fromHevy(records, header, source) };
  if (format === "strong") return { format, header, ...fromStrong(records, header, source, strongUnit) };
  throw new UserError(`Unrecognised workout CSV. Expected a Hevy or Strong export. Header received: ${header.join(", ")}`);
}

export function workoutFiles(args = {}) {
  if (args.csv) return [{ path: args.csv, source: "csv" }];
  return [
    { path: join(paths.imports, "hevy.csv"), source: "hevy" },
    { path: join(paths.imports, "strong.csv"), source: "strong" },
    { path: paths.workoutLog, source: "log" },
  ].filter((f) => existsSync(f.path));
}

export function loadWorkouts(args = {}) {
  const profile = loadProfile();
  const files = workoutFiles(args);
  const sets = [], meta = [];
  for (const f of files) {
    const parsed = parseWorkoutCsv(readFileSync(f.path, "utf8"), { source: f.source, strongUnit: profile?.strong_unit ?? unitOf(profile) });
    sets.push(...parsed.sets);
    meta.push({ source: f.source, file: f.path, format: parsed.format, sets: parsed.sets.length, modified: statSync(f.path).mtime, unreadDates: parsed.badDates.slice(0, 5) });
  }
  return { sets, meta, profile, unit: unitOf(profile), lang: profile?.language ?? "en" };
}

const effective = (s) => s.type !== "warmup";
export const epley = (kg, reps) => (kg > 0 && reps > 0 ? (reps === 1 ? kg : kg * (1 + reps / 30)) : null);

export function groupWorkouts(sets) {
  const map = new Map();
  for (const s of sets) {
    if (!map.has(s.workout)) map.set(s.workout, { title: s.title, start: s.start, end: s.end, source: s.source, sets: [] });
    map.get(s.workout).sets.push(s);
  }
  return [...map.values()].sort((a, b) => a.start - b.start);
}

function sessionScore(exercise, sets) {
  const entry = entryFor(exercise);
  const loaded = sets.filter((s) => s.kg > 0 && s.reps > 0);
  if (loaded.length && !entry?.assisted) {
    const best = loaded.reduce((a, s) => (epley(s.kg, s.reps) > epley(a.kg, a.reps) ? s : a));
    return { kind: "e1rm", value: epley(best.kg, best.reps), best };
  }
  const withReps = sets.filter((s) => s.reps > 0);
  if (withReps.length) {
    const best = withReps.reduce((a, s) => (s.reps > a.reps ? s : a));
    return { kind: entry?.assisted ? "reps_assisted" : "reps", value: best.reps, best };
  }
  const timed = sets.filter((s) => s.seconds > 0);
  if (timed.length) {
    const best = timed.reduce((a, s) => (s.seconds > a.seconds ? s : a));
    return { kind: "seconds", value: best.seconds, best };
  }
  return null;
}

const fmtSet = (s, unit) => {
  if (s.kg > 0) return `${toUnit(s.kg, unit, 2)}${unit}×${s.reps ?? "?"}${s.rpe ? `@${s.rpe}` : ""}`;
  if (s.reps > 0) return `${s.reps} reps${s.rpe ? `@${s.rpe}` : ""}`;
  if (s.seconds > 0) return `${round(s.seconds, 0)}s`;
  if (s.km > 0) return `${s.km}km`;
  return "?";
};

export function sessionsByExercise(sets, unit) {
  const map = new Map();
  for (const s of sets.filter(effective)) {
    if (isCardio(s.exercise)) continue;
    if (!map.has(s.exercise)) map.set(s.exercise, new Map());
    const byWorkout = map.get(s.exercise);
    if (!byWorkout.has(s.workout)) byWorkout.set(s.workout, { date: s.start, sets: [] });
    byWorkout.get(s.workout).sets.push(s);
  }
  const out = new Map();
  for (const [ex, byWorkout] of map) {
    out.set(ex, [...byWorkout.values()].sort((a, b) => a.date - b.date).map((w) => {
      const score = sessionScore(ex, w.sets);
      return {
        date: isoDay(w.date), when: w.date, sets: w.sets.length,
        top: score ? fmtSet(score.best, unit) : null,
        metric: score?.kind ?? null,
        score: score ? (score.kind === "e1rm" ? toUnit(score.value, unit) : round(score.value, 0)) : null,
        rawScore: score?.value ?? null,
        detail: w.sets.map((s) => fmtSet(s, unit)).join(", "),
        tonnage: toUnit(w.sets.reduce((a, s) => a + (s.kg ?? 0) * (s.reps ?? 0), 0), unit, 0),
      };
    }));
  }
  return out;
}

function addSets(target, exercise, weight = 1) {
  const m = musclesFor(exercise);
  if (!m) return false;
  for (const g of m.primary) target[g] = (target[g] ?? 0) + weight;
  for (const g of m.secondary) target[g] = (target[g] ?? 0) + weight * 0.5;
  return true;
}

function weeklyVolume(data, weeks) {
  const partial = today().getDay() !== 0;
  const buckets = weeks + (partial ? 1 : 0);
  const since = weekKey(new Date(today().getTime() - (buckets - 1) * 7 * DAY));
  const workouts = groupWorkouts(data.sets).filter((w) => weekKey(w.start) >= since && w.start <= today());
  const perWeek = {}, unmapped = new Set();
  for (let i = buckets - 1; i >= 0; i--) perWeek[weekKey(new Date(today().getTime() - i * 7 * DAY))] = { sessions: 0, minutes: 0, workingSets: 0, cardioMinutes: 0, avgRpe: null, setsByGroup: {}, ...(i === 0 && partial ? { partial: true } : {}) };
  for (const w of workouts) {
    const b = perWeek[weekKey(w.start)];
    if (!b) continue;
    b.sessions++;
    if (w.end) b.minutes += Math.round((w.end - w.start) / 60000);
    const rpes = [];
    for (const s of w.sets.filter(effective)) {
      if (isCardio(s.exercise)) { b.cardioMinutes += Math.round((s.seconds ?? 0) / 60); continue; }
      b.workingSets++;
      if (s.rpe) rpes.push(s.rpe);
      if (!addSets(b.setsByGroup, s.exercise)) unmapped.add(s.exercise);
    }
    if (rpes.length) b.avgRpe = round(mean(rpes));
  }
  const avg = {};
  const complete = Object.values(perWeek).filter((b) => !b.partial);
  for (const g of MUSCLE_GROUPS) avg[g] = round(mean(complete.map((b) => b.setsByGroup[g] ?? 0)));
  for (const b of Object.values(perWeek)) for (const g of Object.keys(b.setsByGroup)) b.setsByGroup[g] = round(b.setsByGroup[g]);
  return { perWeek, avg, workouts, unmapped: [...unmapped] };
}

export const LEVEL_VOLUME = {
  novice: [4, 10], beginner: [6, 12], intermediate: [10, 18], advanced: [12, 22], elite: [12, 25],
};

function cmdInfo(data) {
  const workouts = groupWorkouts(data.sets);
  const last = workouts.at(-1);
  return {
    sources: data.meta.map((m) => ({ ...m, modified: m.modified.toISOString(), daysSinceModified: daysBetween(m.modified, today()) })),
    workouts: workouts.length,
    sets: data.sets.length,
    firstWorkout: workouts[0] && isoDay(workouts[0].start),
    lastWorkout: last && isoDay(last.start),
    daysSinceLastWorkout: last ? daysBetween(last.start, today()) : null,
    unmapped: [...new Set(data.sets.map((s) => s.exercise))].filter((e) => !entryFor(e)),
    hint: data.meta.length ? undefined : "No workout data yet. Import a Hevy/Strong CSV (sync) or log sets with: workouts log",
  };
}

function cmdSummary(data, args) {
  const weeks = Number(args.weeks ?? 4);
  const { perWeek, avg, workouts, unmapped } = weeklyVolume(data, weeks);
  const level = data.profile?.level ?? "beginner";
  const [lo, hi] = LEVEL_VOLUME[level] ?? LEVEL_VOLUME.beginner;
  const targets = data.profile?.volume_targets ?? {};
  const status = Object.fromEntries(MUSCLE_GROUPS.map((g) => {
    const [min, max] = targets[g] ?? [lo, hi];
    const v = avg[g];
    return [g, { avgSets: v, target: [min, max], status: v < min ? "below" : v > max ? "above" : "in_range" }];
  }));
  return {
    weeks, level,
    note: "Working sets (no warm-ups). Primary muscle = 1 set, secondary = 0.5. Weeks start on Monday. Averages use complete weeks only; the current week is shown as partial.",
    perWeek,
    volumeByGroup: status,
    sessions: workouts.map((w) => ({ date: isoDay(w.start), title: w.title, exercises: new Set(w.sets.map((s) => s.exercise)).size, workingSets: w.sets.filter(effective).length })),
    unmapped,
  };
}

function cmdLast(data, args) {
  const n = Number(args.n ?? 1);
  const hist = sessionsByExercise(data.sets, data.unit);
  return groupWorkouts(data.sets).slice(-n).map((w) => ({
    date: isoDay(w.start), title: w.title, minutes: w.end ? Math.round((w.end - w.start) / 60000) : null,
    exercises: [...new Set(w.sets.map((s) => s.exercise))].map((ex) => {
      const sessions = hist.get(ex) ?? [];
      const idx = sessions.findIndex((s) => s.when.getTime() === w.start.getTime());
      const cur = sessions[idx], prev = idx > 0 ? sessions[idx - 1] : null;
      return {
        exercise: displayName(ex, data.lang), logged: ex, sets: cur?.detail, top: cur?.top, metric: cur?.metric, score: cur?.score,
        previous: prev ? { date: prev.date, top: prev.top, score: prev.score } : null,
        change: prev && cur?.rawScore && prev.rawScore ? round(((cur.rawScore - prev.rawScore) / prev.rawScore) * 100, 1) : null,
      };
    }),
  }));
}

export function findExercise(names, query, lang) {
  const n = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const q = n(query);
  const exact = names.find((x) => n(x) === q || n(displayName(x, lang)) === q || n(displayName(x, "en")) === q);
  if (exact) return exact;
  const tokens = q.split(/\s+/).filter(Boolean);
  const hay = (x) => `${n(x)} ${n(displayName(x, lang))} ${n(displayName(x, "en"))}`;
  const partial = names.filter((x) => tokens.every((t) => hay(x).includes(t)));
  return partial.length === 1 ? partial[0] : partial;
}

function cmdExercise(data, args) {
  const query = args._.slice(1).join(" ");
  if (!query) throw new UserError('Usage: workouts exercise "<name>"');
  const hist = sessionsByExercise(data.sets, data.unit);
  const match = findExercise([...hist.keys()], query, data.lang);
  if (Array.isArray(match)) return { error: match.length ? "Several exercises match" : "No exercise matches", candidates: (match.length ? match : [...hist.keys()]).map((x) => displayName(x, data.lang)).sort() };
  const sessions = hist.get(match);
  const scored = sessions.filter((s) => s.rawScore != null);
  const best = scored.reduce((a, s) => (!a || s.rawScore > a.rawScore ? s : a), null);
  const recent = scored.filter((s) => daysBetween(s.when, today()) <= 56);
  const slope = slopePerDay(recent.map((s) => ({ x: s.when.getTime() / DAY, y: s.rawScore })));
  const base = mean(recent.map((s) => s.rawScore));
  return {
    exercise: displayName(match, data.lang), logged: match, muscles: musclesFor(match), unit: data.unit,
    sessions: sessions.length, metric: sessions.at(-1)?.metric,
    best: best && { date: best.date, top: best.top, score: best.score },
    trend8Weeks: slope != null && base ? { pctPerWeek: round((slope * 7 / base) * 100, 2), sessions: recent.length } : null,
    history: sessions.slice(-Number(args.last ?? 12)).map(({ when, rawScore, ...s }) => s),
  };
}

function cmdRecords(data) {
  const hist = sessionsByExercise(data.sets, data.unit);
  const out = [];
  for (const [ex, sessions] of hist) {
    const scored = sessions.filter((s) => s.rawScore != null);
    if (!scored.length) continue;
    const best = scored.reduce((a, s) => (s.rawScore > a.rawScore ? s : a));
    out.push({ exercise: displayName(ex, data.lang), metric: best.metric, score: best.score, top: best.top, date: best.date, sessions: sessions.length });
  }
  return { unit: data.unit, records: out.sort((a, b) => b.sessions - a.sessions) };
}

export function stalled(data, minSessions = 3) {
  const hist = sessionsByExercise(data.sets, data.unit);
  const out = [];
  for (const [ex, sessions] of hist) {
    const scored = sessions.filter((s) => s.rawScore != null && s.metric !== "reps_assisted");
    if (scored.length < minSessions + 1) continue;
    const recent = scored.slice(-minSessions), before = scored.slice(0, -minSessions);
    const prevBest = Math.max(...before.map((s) => s.rawScore));
    const recentBest = Math.max(...recent.map((s) => s.rawScore));
    if (recentBest <= prevBest && daysBetween(scored.at(-1).when, today()) <= 28) {
      out.push({ exercise: displayName(ex, data.lang), logged: ex, metric: scored.at(-1).metric, previousBest: before.find((s) => s.rawScore === prevBest)?.score, recentBest: recent.find((s) => s.rawScore === recentBest)?.score, lastSessions: recent.map((s) => `${s.date}: ${s.top}`) });
    }
  }
  return out;
}

function cmdStalled(data, args) {
  const n = Number(args.sessions ?? 3);
  return { rule: `No improvement on the best score (e1RM, or reps for bodyweight) in the last ${n} sessions, trained within 28 days`, stalled: stalled(data, n) };
}

const STRENGTH_RATIOS = [
  { name: "overhead_press_to_bench", a: "Overhead Press (Barbell)", b: "Bench Press (Barbell)", range: [0.6, 0.72], low: "shoulders/overhead strength lag behind pressing", high: "bench lags behind overhead pressing" },
  { name: "row_to_bench", a: "Bent Over Row (Barbell)", b: "Bench Press (Barbell)", range: [0.75, 1.05], low: "upper back lags behind chest", high: null },
  { name: "deadlift_to_squat", a: "Deadlift (Barbell)", b: "Squat (Barbell)", range: [1.1, 1.3], low: "posterior chain (hamstrings/glutes/back) lags", high: "quads/squat lag behind the hinge" },
  { name: "front_to_back_squat", a: "Front Squat", b: "Squat (Barbell)", range: [0.8, 0.9], low: "quads or upper-back posture lag", high: null },
];

const STANDARDS = {
  male: { "Squat (Barbell)": [1.0, 1.5, 2.0], "Bench Press (Barbell)": [0.75, 1.0, 1.5], "Deadlift (Barbell)": [1.25, 1.75, 2.5], "Overhead Press (Barbell)": [0.5, 0.75, 1.0] },
  female: { "Squat (Barbell)": [0.75, 1.25, 1.5], "Bench Press (Barbell)": [0.5, 0.75, 1.0], "Deadlift (Barbell)": [1.0, 1.5, 2.0], "Overhead Press (Barbell)": [0.35, 0.5, 0.75] },
};

function bestRecent(hist, name, days = 56) {
  const s = (hist.get(name) ?? []).filter((x) => x.metric === "e1rm" && daysBetween(x.when, today()) <= days);
  return s.length ? Math.max(...s.map((x) => x.rawScore)) : null;
}

async function cmdBalance(data, args) {
  const weeks = Number(args.weeks ?? 4);
  const { avg, unmapped } = weeklyVolume(data, weeks);
  const profile = data.profile ?? {};
  const [lo, hi] = LEVEL_VOLUME[profile.level] ?? LEVEL_VOLUME.beginner;
  const targets = profile.volume_targets ?? {};
  const priorities = new Set(profile.priorities ?? []);
  const reported = new Set(profile.weak_points ?? []);
  const sum = (gs) => gs.reduce((a, g) => a + (avg[g] ?? 0), 0);
  const ratio = (a, b) => (b ? round(a / b, 2) : null);

  const hist = sessionsByExercise(data.sets, data.unit);
  const trendByGroup = {};
  for (const [ex, sessions] of hist) {
    const recent = sessions.filter((s) => s.rawScore != null && daysBetween(s.when, today()) <= 56);
    if (recent.length < 3) continue;
    const slope = slopePerDay(recent.map((s) => ({ x: s.when.getTime() / DAY, y: s.rawScore })));
    const base = mean(recent.map((s) => s.rawScore));
    if (slope == null || !base) continue;
    const pct = (slope * 7 / base) * 100;
    for (const g of musclesFor(ex)?.primary ?? []) (trendByGroup[g] ??= []).push({ exercise: displayName(ex, data.lang), pctPerWeek: round(pct, 2) });
  }
  const groupTrend = Object.fromEntries(Object.entries(trendByGroup).map(([g, xs]) => [g, { pctPerWeek: round(mean(xs.map((x) => x.pctPerWeek)), 2), exercises: xs }]));
  const trendValues = Object.values(groupTrend).map((t) => t.pctPerWeek);
  const medianTrend = trendValues.length ? trendValues.sort((a, b) => a - b)[Math.floor(trendValues.length / 2)] : null;

  const ratios = {
    pull_to_push_sets: { value: ratio(sum(REGIONS.pull), sum(REGIONS.push)), healthy: "≥ 1.0" },
    hamstrings_to_quads_sets: { value: ratio(avg.hamstrings, avg.quads), healthy: "≥ 0.6" },
    rear_to_front_delts_sets: { value: ratio(avg.rear_delts, avg.front_delts), healthy: "≥ 0.5 (front delts get lots of indirect work)" },
    side_delts_sets: { value: avg.side_delts, healthy: `≥ ${Math.max(4, lo)} direct sets` },
  };

  const strengthRatios = [];
  for (const r of STRENGTH_RATIOS) {
    const a = bestRecent(hist, r.a), b = bestRecent(hist, r.b);
    if (!a || !b) continue;
    const v = round(a / b, 2);
    strengthRatios.push({ name: r.name, value: v, typical: r.range, reading: v < r.range[0] ? r.low : v > r.range[1] ? r.high : "within the typical band" });
  }

  const bw = await latestBodyweightKg();
  const sex = profile.sex === "female" ? "female" : profile.sex === "male" ? "male" : null;
  const relativeStrength = [];
  if (bw && sex) {
    for (const [lift, [beg, inter, adv]] of Object.entries(STANDARDS[sex])) {
      const e = bestRecent(hist, lift);
      if (!e) continue;
      const x = e / bw;
      relativeStrength.push({ lift: displayName(lift, data.lang), xBodyweight: round(x, 2), band: x < beg ? "novice" : x < inter ? "beginner–intermediate" : x < adv ? "intermediate–advanced" : "advanced+" });
    }
  }

  const MAJOR = ["chest", "lats", "upper_back", "side_delts", "rear_delts", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "abs"];
  const below = MAJOR.filter((g) => (avg[g] ?? 0) < (targets[g]?.[0] ?? lo));
  const globalLow = below.length >= MAJOR.length / 2;
  const majorVols = MAJOR.map((g) => avg[g] ?? 0).sort((a, b) => a - b);
  const medianVol = majorVols[Math.floor(majorVols.length / 2)];
  const byGroup = new Map();
  const flag = (group, reason, weight = 1) => {
    const c = byGroup.get(group) ?? { group, score: 0, reasons: [] };
    c.score += weight;
    c.reasons.push(reason);
    byGroup.set(group, c);
  };
  for (const g of MAJOR) {
    const v = avg[g] ?? 0;
    const [min] = targets[g] ?? [lo, hi];
    if (medianVol > 0 && v < medianVol * 0.6) flag(g, `${v} sets/week vs ${medianVol} median across major groups`);
    else if (!globalLow && v < min) flag(g, `${v} sets/week < ${min} target for level`);
    const t = groupTrend[g];
    if (t && medianTrend != null && t.pctPerWeek < Math.min(0.25, medianTrend - 0.5)) flag(g, `strength trend ${t.pctPerWeek}%/week vs median ${medianTrend}%`);
    if (reported.has(g)) flag(g, "reported by the user as a weak point", 2);
    if (priorities.has(g)) flag(g, "user priority", 2);
  }
  if (ratios.pull_to_push_sets.value != null && ratios.pull_to_push_sets.value < 0.9) for (const g of ["lats", "upper_back"]) flag(g, `pull:push set ratio ${ratios.pull_to_push_sets.value}`);
  if (ratios.hamstrings_to_quads_sets.value != null && ratios.hamstrings_to_quads_sets.value < 0.5) flag("hamstrings", `hamstrings:quads set ratio ${ratios.hamstrings_to_quads_sets.value}`);
  if (ratios.rear_to_front_delts_sets.value != null && ratios.rear_to_front_delts_sets.value < 0.4) flag("rear_delts", `rear:front delt set ratio ${ratios.rear_to_front_delts_sets.value}`);
  for (const s of strengthRatios) if (s.reading && s.reading !== "within the typical band") flag(s.name, `${s.name} = ${s.value} (typical ${s.typical.join("–")}): ${s.reading}`);

  return {
    weeks, level: profile.level ?? "beginner", defaultTarget: [lo, hi],
    note: "Candidates are signals, not verdicts. Cross them with photos/measurements, the user's own perception and technique before prescribing a specialisation block.",
    globalFlags: globalLow ? [`${below.length}/${MAJOR.length} major groups are below the ${lo}–${hi} sets/week target for this level: raise overall volume (or consistency) before specialising.`] : [],
    avgSetsPerWeek: avg, ratios, groupStrengthTrend8Weeks: groupTrend, strengthRatios, relativeStrength,
    candidates: [...byGroup.values()].sort((a, b) => b.score - a.score),
    unmapped,
  };
}

function parseSetSpec(spec) {
  return String(spec).split(/[,;]/).map((x) => x.trim()).filter(Boolean).map((x) => {
    const rpe = /@\s*([\d.,]+)/.exec(x)?.[1];
    const body = x.replace(/@.*/, "").trim();
    let m;
    if ((m = /^([\d.,]+)\s*(kg|lb|lbs)?\s*[x×*]\s*(\d+)$/i.exec(body))) return { weight: num(m[1]), unit: m[2]?.toLowerCase().startsWith("lb") ? "lb" : null, reps: +m[3], rpe: num(rpe) };
    if ((m = /^(\d+)\s*(reps?)?$/i.exec(body))) return { reps: +m[1], rpe: num(rpe) };
    if ((m = /^(\d+)\s*(s|sec|secs|seconds)$/i.exec(body))) return { seconds: +m[1], rpe: num(rpe) };
    if ((m = /^(\d+):(\d{2})$/.exec(body))) return { seconds: +m[1] * 60 + +m[2], rpe: num(rpe) };
    throw new UserError(`Could not read set "${x}". Use 60x8, 60x8@8, 12 (reps), 45s or 2:30.`);
  });
}

function cmdLog(data, args) {
  const exercise = args.exercise;
  if (!exercise || (!args.sets && !args.warmup)) throw new UserError('Usage: workouts log --exercise "<name>" --sets "60x8,60x8,57.5x8@9" [--warmup "40x10"] [--date YYYY-MM-DD] [--time HH:MM] [--title "Upper A"] [--minutes 70] [--unit kg|lb] [--notes "..."]');
  const date = typeof args.date === "string" ? args.date : isoDay(today());
  const time = typeof args.time === "string" ? args.time : "12:00";
  const start = `${date} ${time}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) throw new UserError("--date must be YYYY-MM-DD and --time HH:MM");
  const endDate = args.minutes ? new Date(parseDate(start).getTime() + Number(args.minutes) * 60000) : null;
  const end = endDate ? `${isoDay(endDate)} ${endDate.toTimeString().slice(0, 5)}` : "";
  const unit = args.unit === "lb" || (args.unit !== "kg" && data.unit === "lb") ? "lb" : "kg";
  const existing = data.sets.filter((s) => s.source === "log" && s.exercise === exercise && isoDay(s.start) === date).length;
  const rows = [];
  const push = (list, type) => list.forEach((s) => rows.push({
    title: args.title ?? "Workout", start_time: start, end_time: end, exercise_title: exercise, set_index: existing + rows.length, set_type: type,
    weight_kg: s.weight != null ? round((s.unit ?? unit) === "lb" ? s.weight * LB : s.weight, 3) : "", reps: s.reps ?? "", distance_km: "", duration_seconds: s.seconds ?? "", rpe: s.rpe ?? "", notes: args.notes ?? "", source: "chat",
  }));
  if (args.warmup) push(parseSetSpec(args.warmup), "warmup");
  if (args.sets) push(parseSetSpec(args.sets), "normal");
  appendCsv(paths.workoutLog, LOG_HEADER, rows);
  return { logged: rows.length, exercise: displayName(exercise, data.lang), known: Boolean(entryFor(exercise)), date, file: paths.workoutLog, hint: entryFor(exercise) ? undefined : "Exercise not in the catalogue: add it with `exercises add` so it counts towards muscle volume." };
}

export function cmdWorkouts(args) {
  const sub = args._[0];
  const commands = { info: cmdInfo, summary: cmdSummary, last: cmdLast, exercise: cmdExercise, records: cmdRecords, stalled: cmdStalled, balance: cmdBalance, log: cmdLog };
  if (!commands[sub]) throw new UserError(`Usage: workouts <${Object.keys(commands).join("|")}>`);
  const data = loadWorkouts(args);
  if (!data.meta.length && !["info", "log"].includes(sub)) return { error: "No workout data yet", hint: "Import a Hevy/Strong CSV with `sync`, or log sets with `workouts log`." };
  return commands[sub](data, args);
}
