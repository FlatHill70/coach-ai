import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "plugins", "coach", "skills", "coach", "scripts", "coach.mjs");
const TODAY = "2026-10-05";

const newHome = () => mkdtempSync(join(tmpdir(), "coach-test-"));
const env = (home, extra = {}) => ({ ...process.env, COACH_HOME: home, COACH_TODAY: TODAY, COACH_NO_UPDATE_CHECK: "1", COACH_INBOX: "", ...extra });

function run(home, args, extra) {
  const r = spawnSync(process.execPath, [CLI, ...args], { env: env(home, extra), encoding: "utf8" });
  if (r.status !== 0) throw Object.assign(new Error(`coach ${args.join(" ")} failed (${r.status}): ${r.stderr}`), { stderr: r.stderr, status: r.status });
  return JSON.parse(r.stdout);
}

function runError(home, args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { env: env(home), encoding: "utf8" });
  assert.equal(r.status, 2, `expected a user error, got ${r.status}: ${r.stdout}${r.stderr}`);
  return JSON.parse(r.stderr).error;
}

function profile(home, p) {
  run(home, ["init"]);
  run(home, ["profile", "set", ...Object.entries(p).map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)]);
}

const HEVY_HEADER = '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"';

test("Hevy CSV with localised dates, warm-ups and weekly volume", () => {
  const home = newHome();
  profile(home, { sex: "male", age: 30, height_cm: 180, level: "beginner", language: "es" });
  mkdirSync(join(home, "imports"), { recursive: true });
  const csv = [HEVY_HEADER,
    '"Push","28 sept 2026, 9:15","28 sept 2026, 10:30","","Bench Press (Barbell)",,"",0,"warmup",40,10,,,',
    '"Push","28 sept 2026, 9:15","28 sept 2026, 10:30","","Bench Press (Barbell)",,"",1,"normal",80,8,,,8',
    '"Push","28 sept 2026, 9:15","28 sept 2026, 10:30","","Bench Press (Barbell)",,"",2,"normal",80,7,,,9',
    '"Push","21 Sep 2026, 9:00","21 Sep 2026, 10:00","","Bench Press (Barbell)",,"",0,"normal",77.5,8,,,8',
    '"Push","21 Sep 2026, 9:00","21 Sep 2026, 10:00","","My Weird Machine",,"",1,"normal",30,12,,,',
  ].join("\n");
  writeFileSync(join(home, "imports", "hevy.csv"), csv);
  const info = run(home, ["workouts", "info"]);
  assert.equal(info.workouts, 2);
  assert.equal(info.lastWorkout, "2026-09-28");
  assert.deepEqual(info.unmapped, ["My Weird Machine"]);
  const last = run(home, ["workouts", "last"])[0];
  const bench = last.exercises[0];
  assert.equal(bench.exercise, "Press de banca con barra");
  assert.equal(bench.sets, "80kg×8@8, 80kg×7@9");
  assert.ok(bench.change > 0);
  const summary = run(home, ["workouts", "summary", "--weeks", "2"]);
  assert.equal(summary.volumeByGroup.chest.avgSets, 1.5);
  assert.equal(summary.volumeByGroup.triceps.avgSets, 0.8);
});

test("Strong CSV: semicolons, pounds, warm-up markers and rest timers", () => {
  const home = newHome();
  profile(home, { units: "lb", strong_unit: "lb", sex: "female", age: 34, height_cm: 165 });
  mkdirSync(join(home, "imports"), { recursive: true });
  writeFileSync(join(home, "imports", "strong.csv"), [
    "Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE",
    "2026-09-30 18:00:00;Legs;1h 5m;Squat (Barbell);W;95;5;0;0;;;",
    "2026-09-30 18:00:00;Legs;1h 5m;Squat (Barbell);1;135;5;0;0;;;8",
    "2026-09-30 18:00:00;Legs;1h 5m;Squat (Barbell);2;135;5;0;0;;;8,5",
    "2026-09-30 18:00:00;Legs;1h 5m;Rest Timer;Rest Timer;0;0;0;90;;;",
    "2026-09-30 18:00:00;Legs;1h 5m;Leg Press;1;270;10;0;0;;;",
    "2026-09-30 18:00:00;Legs;1h 5m;Bulgarian Split Squat;1;40;8;0;0;;;",
  ].join("\n"));
  const last = run(home, ["workouts", "last"])[0];
  assert.equal(last.minutes, 65);
  assert.equal(last.exercises.length, 3);
  assert.equal(last.exercises[0].sets, "135lb×5@8, 135lb×5@8.5");
  assert.deepEqual(run(home, ["workouts", "info"]).unmapped, [], "names without the equipment suffix map to the catalogue");
  assert.equal(run(home, ["workouts", "exercise", "squat"]).logged, "Squat (Barbell)", "an exact base name wins over partial matches");
});

test("chat logging of sets, reps-only and timed sets", () => {
  const home = newHome();
  profile(home, { sex: "male", age: 22, height_cm: 175 });
  run(home, ["workouts", "log", "--exercise", "Pull Up", "--sets", "8,7,6@9", "--title", "Pull", "--date", "2026-10-04"]);
  run(home, ["workouts", "log", "--exercise", "Plank", "--sets", "45s,1:00", "--title", "Pull", "--date", "2026-10-04"]);
  run(home, ["workouts", "log", "--exercise", "Bent Over Row (Barbell)", "--sets", "135lbx8, 60kgx8", "--warmup", "40x10", "--title", "Pull", "--date", "2026-10-04"]);
  const last = run(home, ["workouts", "last"])[0];
  assert.equal(last.exercises.length, 3);
  const row = last.exercises.find((e) => e.logged === "Bent Over Row (Barbell)");
  assert.equal(row.sets, "61.24kg×8, 60kg×8");
  const plank = last.exercises.find((e) => e.logged === "Plank");
  assert.equal(plank.sets, "45s, 60s");
  assert.match(runError(home, ["workouts", "log", "--exercise", "X", "--sets", "eight"]), /Could not read set/);
});

test("Hevy workouts copied by hand give way to the export; latest reports every source", () => {
  const home = newHome();
  profile(home, { sex: "male", age: 19, height_cm: 163, language: "es" });
  run(home, ["workouts", "log", "--exercise", "Bench Press (Barbell)", "--sets", "60x8,60x8", "--title", "Push", "--date", "2026-10-01", "--source", "hevy"]);
  run(home, ["workouts", "log", "--exercise", "Squat (Barbell)", "--sets", "80x5", "--title", "Legs", "--date", "2026-10-03", "--source", "hevy"]);
  run(home, ["workouts", "log", "--exercise", "Plank", "--sets", "45s", "--title", "Core", "--date", "2026-10-01"]);
  let latest = run(home, ["latest"]);
  assert.equal(latest.workouts.last.date, "2026-10-03");
  assert.equal(latest.workouts.last.from, "hevy_by_hand");
  assert.deepEqual(latest.workouts.last.exercises, ["Sentadilla con barra"]);

  mkdirSync(join(home, "imports"), { recursive: true });
  writeFileSync(join(home, "imports", "hevy.csv"), [HEVY_HEADER,
    '"Push","1 Oct 2026, 18:00","1 Oct 2026, 19:00","","Bench Press (Barbell)",,"",0,"normal",60,8,,,',
    '"Push","1 Oct 2026, 18:00","1 Oct 2026, 19:00","","Bench Press (Barbell)",,"",1,"normal",60,8,,,',
  ].join("\n"));
  const info = run(home, ["workouts", "info"]);
  assert.equal(info.workouts, 3, "the hand copy of 1 Oct is replaced by the export; the 3 Oct copy and the extra core session stay");
  assert.deepEqual(info.duplicatesSkipped.map((d) => d.date), ["2026-10-01"]);
  assert.equal(run(home, ["workouts", "summary", "--weeks", "1"]).volumeByGroup.chest.avgSets, 2, "the 2 export sets count once, not twice with the hand copy");
  const again = run(home, ["workouts", "log", "--exercise", "Bench Press (Barbell)", "--sets", "60x8", "--date", "2026-10-01", "--source", "hevy"]);
  assert.equal(again.logged, 0, "a day already in the export is not copied again");
  assert.match(runError(home, ["workouts", "log", "--exercise", "Plank", "--sets", "30s", "--source", "strava"]), /--source only accepts hevy/);

  run(home, ["body", "log", "--weight", "54.6", "--date", "2026-09-29"]);
  run(home, ["nutrition", "log", "--kcal", "650", "--protein", "40", "--date", "2026-10-04"]);
  latest = run(home, ["latest"]);
  assert.equal(latest.workouts.last.date, "2026-10-03");
  assert.equal(latest.workouts.imports[0].lastWorkoutInFile, "2026-10-01");
  assert.deepEqual(latest.body.weight, { date: "2026-09-29", daysAgo: 6, kg: 54.6, source: "log" });
  assert.equal(latest.food.kcal, 650);
  assert.deepEqual(latest.stale.map((s) => s.area), ["weight"]);
});

test("custom exercises are saved, validated and counted", () => {
  const home = newHome();
  profile(home, { sex: "male", age: 25, height_cm: 180 });
  assert.match(runError(home, ["exercises", "add", "Hip Thing", "--primary", "butt"]), /Unknown muscle group/);
  const added = run(home, ["exercises", "add", "Hip Thing", "--primary", "glutes", "--secondary", "hamstrings", "--es", "Cosa de cadera"]);
  assert.equal(added.entry.name.es, "Cosa de cadera");
  run(home, ["workouts", "log", "--exercise", "Hip Thing", "--sets", "100x10,100x10", "--date", "2026-09-30"]);
  const s = run(home, ["workouts", "summary", "--weeks", "1"]);
  assert.equal(s.unmapped.length, 0);
  assert.ok(run(home, ["exercises", "find", "cadera"]).matches.some((m) => m.key === "Hip Thing"));
});

test("iOS Shortcut file: English and Spanish kinds, fractions and kJ", () => {
  const home = newHome();
  const inbox = join(home, "inbox");
  mkdirSync(inbox);
  writeFileSync(join(inbox, "coach_health.txt"), [
    "weight;2026-10-01T07:10:00+02:00;72,4;kg",
    "peso;2026-10-02T07:10:00+02:00;160;lb",
    "bodyfat;2026-10-01T07:10:00+02:00;0.18;%",
    "kcal;2026-10-01T13:00:00+02:00;2092;kJ",
    "protein;2026-10-01T13:00:00+02:00;40;g",
    "garbage line",
  ].join("\n"));
  profile(home, { sex: "male", age: 30, height_cm: 180, inbox });
  const info = run(home, ["body", "info"]);
  assert.equal(info.rowsByKind.weight, 2);
  assert.deepEqual(info.shortcut.unreadLines, ["garbage line"]);
  const w = run(home, ["body", "weight", "--days", "14"]);
  assert.equal(w.weighIns[1].value, 72.57);
  assert.equal(w.composition.bodyfatPct[0].pct, 18);
  const food = run(home, ["nutrition", "days", "--days", "14"]);
  assert.equal(food.perDay[0].kcal, 500);
});

test("Health Connect export is read through node:sqlite", async (t) => {
  let DatabaseSync;
  try { ({ DatabaseSync } = await import("node:sqlite")); } catch { t.skip("node:sqlite not available"); return; }
  const home = newHome();
  mkdirSync(join(home, "imports"), { recursive: true });
  const db = new DatabaseSync(join(home, "imports", "health_connect.db"));
  db.exec("CREATE TABLE weight_record_table (row_id INTEGER PRIMARY KEY, time INTEGER, zone_offset INTEGER, weight REAL)");
  db.exec("CREATE TABLE nutrition_record_table (row_id INTEGER PRIMARY KEY, start_time INTEGER, end_time INTEGER, energy REAL, protein REAL)");
  const t1 = new Date("2026-10-03T07:00:00").getTime();
  db.prepare("INSERT INTO weight_record_table (time, zone_offset, weight) VALUES (?, 7200, ?)").run(t1, 71800);
  db.prepare("INSERT INTO nutrition_record_table (start_time, end_time, energy, protein) VALUES (?, ?, ?, ?)").run(t1 + 6 * 3600000, t1 + 6 * 3600000, 650000, 42);
  db.close();
  profile(home, { sex: "female", age: 40, height_cm: 168 });
  const w = run(home, ["body", "weight"]);
  assert.equal(w.lastWeighIn.value, 71.8);
  const food = run(home, ["nutrition", "days"]);
  assert.equal(food.perDay[0].kcal, 650);
  assert.equal(food.perDay[0].protein_g, 42);
});

test("nutrition safety rules: teens, low BMI and deficit caps", () => {
  const teen = newHome();
  profile(teen, { sex: "male", birth_date: "2010-06-01", height_cm: 172, weight_kg: 60, goal: "fat_loss", level: "novice", training_days: 3 });
  const t = run(teen, ["nutrition", "targets"]);
  assert.equal(t.age, 16);
  assert.equal(t.goal, "maintenance");
  assert.ok(t.calories.target >= t.maintenance.used - 10);
  assert.ok(t.flags.some((f) => /adolescent/.test(f)));
  assert.deepEqual(t.macros.protein_g, [84, 120]);

  const thin = newHome();
  profile(thin, { sex: "female", age: 25, height_cm: 170, weight_kg: 50, goal: "fat_loss" });
  const th = run(thin, ["nutrition", "targets"]);
  assert.equal(th.goal, "maintenance");

  const big = newHome();
  profile(big, { sex: "male", age: 45, height_cm: 175, weight_kg: 130, goal: "fat_loss", level: "novice", rate_pct_per_week: -2 });
  const b = run(big, ["nutrition", "targets"]);
  assert.ok(b.calories.target >= Math.round(b.maintenance.used * 0.75) - 10);
  assert.ok(b.flags.some((f) => /capped/.test(f)));
  assert.ok(b.macros.protein_g[1] < 2.4 * 130);
});

test("demo dataset: status, weak points, goals and adaptive TDEE", () => {
  const home = newHome();
  execFileSync(process.execPath, [join(ROOT, "examples", "demo", "generate.mjs")], { env: env(home) });
  const status = run(home, ["status"]);
  assert.equal(status.profile.name, "Alex");
  assert.equal(status.workouts.daysSince, 2);
  const balance = run(home, ["workouts", "balance"]);
  assert.equal(balance.candidates[0].group, "side_delts");
  const stalled = run(home, ["workouts", "stalled"]).stalled.map((s) => s.logged);
  assert.ok(stalled.includes("Romanian Deadlift (Barbell)"));
  const goals = run(home, ["goals", "progress"]).goals;
  assert.equal(goals.length, 3);
  assert.ok(goals.every((g) => g.movingTheRightWay));
  const tdee = run(home, ["nutrition", "tdee"]);
  assert.equal(tdee.confidence, "high");
  assert.ok(tdee.tdee > 2000 && tdee.tdee < 3000);
});

test("sync picks the newest Hevy and Strong exports from the inbox by header", () => {
  const home = newHome();
  const inbox = join(home, "drop");
  mkdirSync(inbox);
  writeFileSync(join(inbox, "workout_data.csv"), `${HEVY_HEADER}\n"A","1 Oct 2026, 10:00","1 Oct 2026, 11:00","","Squat (Barbell)",,"",0,"normal",100,5,,,\n`);
  writeFileSync(join(inbox, "strong_export.csv"), "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE\n2026-10-02 10:00:00,B,45m,Deadlift (Barbell),1,140,3,0,0,,,\n");
  writeFileSync(join(inbox, "notes.csv"), "a,b\n1,2\n");
  profile(home, { sex: "male", age: 30, height_cm: 180, inbox });
  const s = run(home, ["sync"]);
  assert.equal(s.hevy.status, "imported");
  assert.equal(s.strong.status, "imported");
  assert.equal(run(home, ["sync"]).hevy.status, "up_to_date");
  assert.equal(run(home, ["workouts", "info"]).workouts, 2);
});

test("SKILL.md frontmatter and manifests stay consistent", () => {
  const skill = readFileSync(join(ROOT, "plugins", "coach", "skills", "coach", "SKILL.md"), "utf8");
  const fm = skill.match(/^---\n([\s\S]*?)\n---/)[1];
  const description = fm.match(/^description: (.*)$/m)[1];
  assert.ok(description.length <= 1536, `description is ${description.length} chars`);
  const skillVersion = fm.match(/version: ([\d.]+)/)[1];
  const plugin = JSON.parse(readFileSync(join(ROOT, "plugins", "coach", ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(plugin.version, skillVersion);
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.version, skillVersion);
  for (const ref of skill.matchAll(/references\/([\w-]+\.md)/g)) readFileSync(join(ROOT, "plugins", "coach", "skills", "coach", "references", ref[1]));
});
