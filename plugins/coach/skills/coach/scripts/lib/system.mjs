import { existsSync, mkdirSync, copyFileSync, statSync, readFileSync, utimesSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";
import {
  SKILL_DIR, paths, readJson, writeJson, loadProfile, inboxDirs, walk, newest, firstBytes, parseCsv, readCsvFile, isoDay, today, daysBetween, round, ageOf, num, UserError,
} from "./common.mjs";
import { detectFormat } from "./workouts.mjs";
import { SHORTCUT_RE, HC_DB, resetHealthCache } from "./health.mjs";

export const REPO = "FlatHill70/coach-ai";
const GITHUB_API = process.env.COACH_GITHUB_API ?? "https://api.github.com";
const GITHUB = process.env.COACH_GITHUB ?? "https://github.com";

export function skillVersion() {
  try {
    return readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8").match(/^\s+version:\s*"?([\d.]+[\w.-]*)"?/m)?.[1] ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function copyIfNewer(src, dest) {
  mkdirSync(paths.imports, { recursive: true });
  if (existsSync(dest) && statSync(dest).mtime.getTime() >= src.mtime.getTime()) return { status: "up_to_date", from: src.name, date: src.mtime.toISOString() };
  copyFileSync(src.path, dest);
  utimesSync(dest, src.mtime, src.mtime);
  return { status: "imported", from: src.path, date: src.mtime.toISOString() };
}

function unzip(zip, dir) {
  const attempts = process.platform === "win32"
    ? [[join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe"), ["-xf", zip, "-C", dir]]]
    : [["unzip", ["-o", "-q", zip, "-d", dir]], ["tar", ["-xf", zip, "-C", dir]], ["python3", ["-m", "zipfile", "-e", zip, dir]]];
  for (const [cmd, args] of attempts) {
    try { execFileSync(cmd, args, { stdio: "ignore" }); return true; } catch { /* next */ }
  }
  return false;
}

function importHealthConnect(files) {
  const dbs = files.filter((f) => /\.db$/i.test(f.name) && /health/i.test(f.name));
  const zips = files.filter((f) => /\.zip$/i.test(f.name) && /health|connect/i.test(f.name));
  const src = newest([...dbs, ...zips]);
  if (!src) return { status: "none_found" };
  const dest = HC_DB();
  if (existsSync(dest) && statSync(dest).mtime.getTime() >= src.mtime.getTime()) return { status: "up_to_date", from: src.name };
  mkdirSync(paths.imports, { recursive: true });
  if (/\.db$/i.test(src.name)) { copyFileSync(src.path, dest); utimesSync(dest, src.mtime, src.mtime); return { status: "imported", from: src.path }; }
  const tmp = join(tmpdir(), `coach-hc-${Date.now()}`);
  mkdirSync(tmp, { recursive: true });
  try {
    if (!unzip(src.path, tmp)) return { status: "error", error: "could not extract the zip (no tar/unzip/python3 available)" };
    const db = walk(tmp, 4).find((f) => /\.db$/i.test(f.name));
    if (!db) return { status: "error", error: "zip contains no .db file", from: src.name };
    copyFileSync(db.path, dest);
    utimesSync(dest, src.mtime, src.mtime);
    return { status: "imported", from: src.path };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export function cmdSync(args) {
  const profile = loadProfile();
  const dirs = inboxDirs(profile);
  const extra = typeof args.from === "string" ? [args.from.replace(/^~(?=$|[\\/])/, homedir())] : [];
  if (extra.length && !existsSync(extra[0])) throw new UserError(`Not found: ${extra[0]}`);
  const files = [
    ...dirs.flatMap((d) => walk(d, 2)),
    ...extra.flatMap((p) => (statSync(p).isDirectory() ? walk(p, 1) : [{ path: p, name: basename(p), mtime: statSync(p).mtime }])),
  ];
  if (!dirs.length && !extra.length) return { error: "No inbox configured", hint: "Set profile.inbox (e.g. ~/iCloudDrive/Coach or a Google Drive folder) or pass --from <file>." };
  const missing = dirs.filter((d) => !existsSync(d));
  const csvs = files.filter((f) => /\.csv$/i.test(f.name)).map((f) => ({ ...f, format: detectFormat(parseCsv(firstBytes(f.path, 2048).split(/\r?\n/)[0] + "\n").header) }));
  const result = { inbox: dirs, missingInbox: missing.length ? missing : undefined };
  const hevy = newest(csvs.filter((f) => f.format === "hevy"));
  const strong = newest(csvs.filter((f) => f.format === "strong"));
  result.hevy = hevy ? copyIfNewer(hevy, join(paths.imports, "hevy.csv")) : { status: "none_found" };
  result.strong = strong ? copyIfNewer(strong, join(paths.imports, "strong.csv")) : { status: "none_found" };
  const shortcut = newest(files.filter((f) => SHORTCUT_RE.test(f.name)));
  result.appleHealthShortcut = shortcut
    ? { ...copyIfNewer(shortcut, join(paths.imports, "apple_health.txt")), hoursSinceUpdate: round((Date.now() - shortcut.mtime) / 3600000) }
    : { status: "none_found" };
  result.healthConnect = importHealthConnect(files);
  resetHealthCache();
  return result;
}

const PROFILE_TEMPLATE = {
  schema: 1, name: null, language: "en", units: "kg", sex: null, birth_date: null, age: null, height_cm: null, weight_kg: null, bodyfat_pct: null,
  level: null, training_age_years: null, goal: null, secondary_goals: [], sport: null,
  training_days: null, training_weekdays: [], session_minutes: null, location: null, equipment: [],
  injuries: [], avoid_exercises: [], preferred_exercises: [], weak_points: [], priorities: [], volume_targets: {},
  activity: null, daily_steps: null, sleep_hours: null,
  nutrition: { tracking: null, diet: null, allergies: [], dislikes: [], budget: null, cooking: null, meals_per_day: null, cuisine: null, supplements: [] },
  screening: { parq_flags: [], cleared_by_professional: null, eating_disorder: false, notes: null },
  guardian_consent: null, pregnant: false, inbox: null, sources: [], strong_unit: null, updated: null,
};

export function cmdInit() {
  mkdirSync(paths.logs, { recursive: true });
  mkdirSync(paths.imports, { recursive: true });
  const created = [];
  if (!existsSync(paths.profile)) { writeJson(paths.profile, { ...PROFILE_TEMPLATE, updated: isoDay(today()) }); created.push(paths.profile); }
  if (!existsSync(paths.goals)) { writeJson(paths.goals, []); created.push(paths.goals); }
  return { home: paths.home, created, next: "Fill profile.json through the onboarding conversation (profile set key=value ...)." };
}

function parseValue(v) {
  if (v === "null") return null;
  if (v === "true" || v === "false") return v === "true";
  if (/^-?\d+([.,]\d+)?$/.test(v)) return num(v);
  if (/^[[{]/.test(v)) { try { return JSON.parse(v); } catch { throw new UserError(`Invalid JSON value: ${v}`); } }
  return v;
}

export function cmdProfile(args) {
  const sub = args._[1] ?? "show";
  const profile = readJson(paths.profile, null);
  if (sub === "show") {
    if (!profile) return { exists: false, hint: "Run `init` and then onboarding." };
    return { exists: true, age: ageOf(profile), adolescent: (ageOf(profile) ?? 99) < 18, profile };
  }
  if (sub === "set") {
    const p = profile ?? { ...PROFILE_TEMPLATE };
    const pairs = args._.slice(2);
    if (!pairs.length) throw new UserError('Usage: profile set key=value [nutrition.diet=vegan] [injuries=["left shoulder"]]');
    const changed = {};
    for (const pair of pairs) {
      const i = pair.indexOf("=");
      if (i < 1) throw new UserError(`Expected key=value, got "${pair}"`);
      const keys = pair.slice(0, i).split(".");
      const value = parseValue(pair.slice(i + 1));
      let obj = p;
      for (const k of keys.slice(0, -1)) obj = obj[k] ??= {};
      obj[keys.at(-1)] = value;
      changed[keys.join(".")] = value;
    }
    p.updated = isoDay(today());
    writeJson(paths.profile, p);
    return { changed };
  }
  if (sub === "review") return profileReview(profile);
  throw new UserError("Usage: profile <show|set|review>");
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// What the profile says next to what the last 4 weeks of data say, so an update only asks about real changes.
async function profileReview(profile) {
  if (!profile) return { exists: false, hint: "Run `init` and then onboarding." };
  const { loadWorkouts, groupWorkouts } = await import("./workouts.mjs");
  const { displayName } = await import("./exercises.mjs");
  const { dailyWeights } = await import("./body.mjs");
  const now = today();
  const lang = profile.language ?? "en";
  const all = groupWorkouts(loadWorkouts().sets);
  const recent = all.filter((w) => daysBetween(w.start, now) <= 28);
  const span = all.length ? Math.min(28, daysBetween(all[0].start, now)) : 0;
  const weekdays = {};
  for (const w of recent) weekdays[WEEKDAYS[w.start.getDay()]] = (weekdays[WEEKDAYS[w.start.getDay()]] ?? 0) + 1;
  const minutes = recent.filter((w) => w.end).map((w) => (w.end - w.start) / 60000);
  const perWeek = span >= 14 ? round(recent.length / (span / 7), 1) : null;
  const avgMinutes = minutes.length ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length) : null;
  const weight = (await dailyWeights()).at(-1);

  const mismatches = [];
  if (weight && profile.weight_kg != null && Math.abs(weight.value - profile.weight_kg) >= 0.5) {
    mismatches.push({ field: "weight_kg", profile: profile.weight_kg, data: round(weight.value, 1), set: `weight_kg=${round(weight.value, 1)}`, safeToApply: true });
  }
  if (perWeek != null && profile.training_days != null && Math.abs(perWeek - profile.training_days) >= 1) {
    mismatches.push({ field: "training_days", profile: profile.training_days, data: perWeek, note: "sessions per week over the last 4 weeks" });
  }
  const regular = Object.entries(weekdays).filter(([, n]) => n >= 2).map(([d]) => d);
  const planned = profile.training_weekdays ?? [];
  if (planned.length && recent.length >= 4) {
    const extra = regular.filter((d) => !planned.includes(d));
    const unused = planned.filter((d) => !weekdays[d]);
    if (extra.length || unused.length) mismatches.push({ field: "training_weekdays", profile: planned, data: weekdays, trainedButNotPlanned: extra, plannedButNotTrained: unused });
  } else if (!planned.length && regular.length) {
    mismatches.push({ field: "training_weekdays", profile: [], data: weekdays, note: "not set: confirm the user's usual days" });
  }
  if (avgMinutes != null && profile.session_minutes && Math.abs(avgMinutes - profile.session_minutes) / profile.session_minutes > 0.2) {
    mismatches.push({ field: "session_minutes", profile: profile.session_minutes, data: avgMinutes });
  }
  const avoid = (profile.avoid_exercises ?? []).map((a) => a.toLowerCase());
  const done = [...new Set(recent.flatMap((w) => w.sets.map((s) => s.exercise)))];
  const vetoed = done.filter((e) => [e, displayName(e, "en"), displayName(e, lang)].some((n) => avoid.includes(String(n).toLowerCase())));
  if (vetoed.length) {
    const last = (e) => isoDay(recent.filter((w) => w.sets.some((s) => s.exercise === e)).at(-1).start);
    mismatches.push({ field: "avoid_exercises", profile: profile.avoid_exercises, data: vetoed.map((e) => ({ exercise: displayName(e, lang), lastDone: last(e) })), note: "vetoed but done recently" });
  }
  const daysSinceUpdate = profile.updated ? daysBetween(new Date(`${profile.updated}T12:00:00`), now) : null;
  return {
    updated: profile.updated ?? null, daysSinceUpdate, reOnboard: daysSinceUpdate != null && daysSinceUpdate > 180,
    current: {
      goal: profile.goal, rate_pct_per_week: profile.rate_pct_per_week, level: profile.level, training_days: profile.training_days, training_weekdays: planned,
      session_minutes: profile.session_minutes, location: profile.location, equipment: profile.equipment, injuries: profile.injuries,
      avoid_exercises: profile.avoid_exercises, weak_points: profile.weak_points, nutrition_tracking: profile.nutrition?.tracking ?? null, auto_update: profile.auto_update ?? false,
    },
    last28Days: { sessions: recent.length, perWeek, weekdays, avgMinutes },
    mismatches,
  };
}

const cmpVersions = (a, b) => {
  const pa = a.split(/[.-]/).map((x) => parseInt(x, 10) || 0), pb = b.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

export function installKind() {
  const p = SKILL_DIR.replace(/\\/g, "/");
  return /\/plugins\/(cache|marketplaces)\//.test(p) ? "plugin" : "manual";
}

export async function checkUpdate({ force = false } = {}) {
  const state = readJson(paths.state, {});
  const current = skillVersion();
  const fresh = state.update && Date.now() - state.update.checkedAt < 86400000;
  let latest = fresh && !force ? state.update.latest : null;
  if (!latest && process.env.COACH_NO_UPDATE_CHECK !== "1") {
    try {
      const res = await fetch(`${GITHUB_API}/repos/${REPO}/releases/latest`, { headers: { "User-Agent": "coach-skill", Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        latest = (await res.json()).tag_name?.replace(/^v/, "") ?? null;
        writeJson(paths.state, { ...state, update: { checkedAt: Date.now(), latest } });
      }
    } catch { /* offline: stay quiet */ }
  }
  const kind = installKind();
  const available = latest ? cmpVersions(latest, current) > 0 : false;
  return {
    current, latest: latest ?? "unknown", updateAvailable: available, install: kind,
    how: !available ? undefined : kind === "plugin"
      ? "Run `/plugin marketplace update coach` (or `claude plugin update coach@coach`), then /reload-plugins. Turn on auto-update in /plugin › Marketplaces › coach."
      : "Re-run the installer: macOS/Linux `curl -fsSL https://raw.githubusercontent.com/FlatHill70/coach-ai/main/install.sh | bash` · Windows `irm https://raw.githubusercontent.com/FlatHill70/coach-ai/main/install.ps1 | iex`",
  };
}

const ORIGIN = { hevy: "hevy_export", strong: "strong_export", csv: "csv", hevy_manual: "hevy_by_hand", chat: "chat" };

export async function cmdLatest() {
  const { loadWorkouts, groupWorkouts } = await import("./workouts.mjs");
  const { displayName } = await import("./exercises.mjs");
  const { firstPerDay } = await import("./body.mjs");
  const { healthRows } = await import("./health.mjs");
  const { dailyFood } = await import("./nutrition.mjs");
  const profile = loadProfile();
  const lang = profile?.language ?? "en";
  const now = today();
  const ago = (day) => daysBetween(new Date(`${day}T12:00:00`), now);
  const stale = [];

  const data = loadWorkouts();
  const workouts = groupWorkouts(data.sets);
  const describe = (w) => w && {
    date: isoDay(w.start), daysAgo: daysBetween(w.start, now), title: w.title, from: ORIGIN[w.sets[0].origin] ?? ORIGIN[w.source] ?? w.source,
    exercises: [...new Set(w.sets.map((s) => s.exercise))].map((e) => displayName(e, lang)),
    workingSets: w.sets.filter((s) => s.type !== "warmup").length,
  };
  const imports = data.meta.filter((m) => m.source !== "log").map((m) => {
    const last = workouts.filter((w) => w.source === m.source).at(-1);
    const fileDaysOld = daysBetween(m.modified, now);
    if (fileDaysOld > 7) stale.push({ area: "workouts", source: m.source, daysAgo: fileDaysOld, action: `export a fresh ${m.source === "strong" ? "Strong" : "Hevy"} CSV, or copy the missing workouts by hand` });
    return { source: m.source, fileDaysOld, lastWorkoutInFile: last ? isoDay(last.start) : null };
  });

  const { rows } = await healthRows();
  const weight = firstPerDay(rows.filter((r) => r.kind === "weight")).at(-1);
  const fat = firstPerDay(rows.filter((r) => r.kind === "bodyfat")).at(-1);
  if (weight && ago(weight.day) > 4) stale.push({ area: "weight", daysAgo: ago(weight.day), action: "weigh in, or check the automation if you are weighing" });
  const measures = readCsvFile(paths.bodyLog).records.filter((r) => ["waist_cm", "hips_cm", "chest_cm", "arm_cm", "thigh_cm", "calf_cm", "neck_cm"].some((k) => r[k])).at(-1);

  const food = (await dailyFood(3650)).at(-1);

  return {
    today: isoDay(now),
    workouts: {
      last: describe(workouts.at(-1)) ?? null,
      lastByHand: describe(workouts.filter((w) => w.source === "log").at(-1)) ?? null,
      imports,
      duplicatesSkipped: data.duplicatesSkipped.length || undefined,
    },
    body: {
      weight: weight ? { date: weight.day, daysAgo: ago(weight.day), kg: round(weight.value, 1), source: weight.source } : null,
      bodyfat: fat ? { date: fat.day, daysAgo: ago(fat.day), pct: round(fat.value, 1) } : null,
      measurements: measures ? { date: measures.date, daysAgo: ago(measures.date) } : null,
    },
    food: food ? { date: food.day, daysAgo: ago(food.day), kcal: round(food.kcal, 0), protein_g: round(food.protein, 0), sources: food.sources } : null,
    stale,
  };
}

// Manual installs replace the skill folder with the latest release zip (checksum verified); the old one stays in <dir>.previous.
export async function installUpdate({ force = false } = {}) {
  const info = await checkUpdate({ force: true });
  if (existsSync(join(SKILL_DIR, "..", "..", "..", "..", ".git"))) return { ...info, installed: false, reason: "dev_checkout", hint: "This copy runs from a git checkout: update it with git pull." };
  if (info.install === "plugin") return { ...info, installed: false, reason: "plugin", hint: info.how ?? "Plugin installs update from /plugin (turn on auto-update in /plugin › Marketplaces › coach)." };
  if (info.latest === "unknown") return { ...info, installed: false, reason: "no_release", hint: "Could not reach GitHub, or no release has been published yet." };
  if (!info.updateAvailable && !force) return { ...info, installed: false, reason: "up_to_date" };

  const base = `${GITHUB}/${REPO}/releases/download/v${info.latest}`;
  const get = async (url) => {
    const res = await fetch(url, { headers: { "User-Agent": "coach-skill" }, redirect: "follow", signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new UserError(`Download failed (${res.status}): ${url}`);
    return Buffer.from(await res.arrayBuffer());
  };
  const zip = await get(`${base}/coach-skill.zip`);
  const sums = (await get(`${base}/SHA256SUMS.txt`)).toString("utf8");
  const expected = sums.match(/^([a-f0-9]{64})\s+\*?coach-skill\.zip$/m)?.[1];
  const { createHash } = await import("node:crypto");
  const actual = createHash("sha256").update(zip).digest("hex");
  if (!expected || expected !== actual) throw new UserError("Checksum mismatch: the downloaded zip was not installed.");

  const { writeFileSync, renameSync, cpSync } = await import("node:fs");
  const tmp = join(tmpdir(), `coach-update-${Date.now()}`);
  mkdirSync(tmp, { recursive: true });
  try {
    const file = join(tmp, "coach-skill.zip");
    writeFileSync(file, zip);
    if (!unzip(file, tmp)) throw new UserError("Could not extract the zip (no tar/unzip/python3 available).");
    const fresh = join(tmp, "coach");
    if (!existsSync(join(fresh, "SKILL.md"))) throw new UserError("The download does not look like the Coach skill.");
    const previous = `${SKILL_DIR}.previous`;
    rmSync(previous, { recursive: true, force: true });
    try {
      renameSync(SKILL_DIR, previous);
      renameSync(fresh, SKILL_DIR);
    } catch {
      if (!existsSync(previous)) cpSync(SKILL_DIR, previous, { recursive: true });
      cpSync(fresh, SKILL_DIR, { recursive: true, force: true });
    }
    writeJson(paths.state, { ...readJson(paths.state, {}), update: { checkedAt: Date.now(), latest: info.latest } });
    return { installed: true, from: info.current, to: info.latest, previous, note: "Your data in ~/.coach was not touched. The new version loads in the next Claude Code session." };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function cmdStatus() {
  const { loadWorkouts, groupWorkouts } = await import("./workouts.mjs");
  const { dailyWeights } = await import("./body.mjs");
  const { dailyFood } = await import("./nutrition.mjs");
  const profile = loadProfile();
  const age = ageOf(profile);
  const data = loadWorkouts();
  const workouts = groupWorkouts(data.sets);
  const last = workouts.at(-1);
  const weights = await dailyWeights();
  const food = await dailyFood(7);
  const goals = readJson(paths.goals, []).filter((g) => !g.archived);
  return {
    home: paths.home,
    profile: profile ? { exists: true, name: profile.name, language: profile.language, goal: profile.goal, level: profile.level, age, adolescent: age != null && age < 18, updated: profile.updated } : { exists: false },
    workouts: { sources: data.meta.map((m) => m.source), lastWorkout: last && isoDay(last.start), daysSince: last ? daysBetween(last.start, today()) : null, importAgeDays: Object.fromEntries(data.meta.filter((m) => m.source !== "log").map((m) => [m.source, daysBetween(m.modified, today())])) },
    body: { lastWeighIn: weights.at(-1)?.day ?? null, daysSince: weights.length ? daysBetween(new Date(`${weights.at(-1).day}T12:00:00`), today()) : null },
    food: { daysLoggedLast7: food.filter((d) => d.day !== isoDay(today())).length },
    goals: goals.length,
    version: await checkUpdate(),
  };
}

