#!/usr/bin/env node
// Builds a fictional 12-week dataset ("Alex") in $COACH_HOME (default: examples/demo/home) for demos, screenshots and tests.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = process.env.COACH_HOME ?? join(dirname(fileURLToPath(import.meta.url)), "home");
const END = new Date(`${process.env.COACH_TODAY ?? "2026-10-05"}T12:00:00`);
const WEEKS = 12;

let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const hevyDate = (d) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${d.getHours()}:${pad(d.getMinutes())}`;
const roundTo = (x, step) => Math.round(x / step) * step;

const DAYS = {
  "Upper A": [
    ["Bench Press (Barbell)", 4, [6, 8], 72.5, 2.5],
    ["Bent Over Row (Barbell)", 4, [8, 10], 60, 2.5],
    ["Overhead Press (Dumbbell)", 3, [8, 12], 20, 2],
    ["Lat Pulldown (Cable)", 3, [10, 12], 55, 2.5],
    ["Chest Fly (Machine)", 3, [12, 15], 40, 5],
    ["Triceps Pushdown", 3, [10, 15], 25, 2.5],
  ],
  "Lower A": [
    ["Squat (Barbell)", 4, [5, 8], 95, 5],
    ["Romanian Deadlift (Barbell)", 3, [8, 10], 80, 5, "stall"],
    ["Leg Press (Machine)", 3, [10, 12], 140, 10],
    ["Standing Calf Raise (Machine)", 4, [10, 15], 60, 5],
  ],
  "Upper B": [
    ["Incline Bench Press (Dumbbell)", 4, [8, 10], 26, 2],
    ["Seated Cable Row - V Grip (Cable)", 3, [10, 12], 60, 2.5],
    ["Pull Up", 3, [6, 12], 0, 0],
    ["Lateral Raise (Dumbbell)", 2, [12, 15], 8, 1, "flat"],
    ["Bicep Curl (Dumbbell)", 3, [10, 12], 12, 1],
    ["Overhead Triceps Extension (Cable)", 2, [10, 15], 20, 2.5],
  ],
  "Lower B": [
    ["Deadlift (Barbell)", 3, [4, 6], 125, 5],
    ["Bulgarian Split Squat", 3, [8, 10], 16, 2],
    ["Seated Leg Curl (Machine)", 3, [10, 12], 45, 5],
    ["Leg Extension (Machine)", 3, [12, 15], 45, 5],
    ["Hanging Leg Raise", 3, [10, 15], 0, 0],
  ],
};
const SCHEDULE = [["Upper A", 0, 18], ["Lower A", 1, 18], ["Upper B", 3, 18], ["Lower B", 5, 10]];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "imports"), { recursive: true });
mkdirSync(join(OUT, "logs"), { recursive: true });

const start = new Date(END);
start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7);

const rows = [["title", "start_time", "end_time", "description", "exercise_title", "superset_id", "exercise_notes", "set_index", "set_type", "weight_kg", "reps", "distance_km", "duration_seconds", "rpe"]];
const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
const state = {};
const firstE1rm = {};
for (let w = 0; w < WEEKS; w++) {
  for (const [title, dow, hour] of SCHEDULE) {
    if (w === 6 && title === "Lower B") continue;
    const s = new Date(start);
    s.setDate(s.getDate() + w * 7 + dow);
    s.setHours(hour, Math.floor(rand() * 4) * 15, 0, 0);
    if (s > END) continue;
    const e = new Date(s.getTime() + (65 + Math.floor(rand() * 20)) * 60000);
    let idx = 0;
    for (const [ex, sets, [lo, hi], base, step, mode] of DAYS[title]) {
      const st = (state[ex] ??= { kg: base, reps: lo });
      if (base > 0) {
        firstE1rm[ex] ??= st.kg * (1 + st.reps / 30);
        rows.push([title, hevyDate(s), hevyDate(e), "", ex, "", "", idx++, "warmup", roundTo(st.kg * 0.5, step), 10, "", "", ""].map(q));
      }
      for (let k = 0; k < sets; k++) {
        const reps = Math.max(base > 0 ? lo : 1, st.reps - (k > 1 ? 1 : 0) - (k === sets - 1 && rand() > 0.6 ? 1 : 0));
        rows.push([title, hevyDate(s), hevyDate(e), "", ex, "", "", idx++, "normal", base > 0 ? st.kg : "", reps, "", "", k === sets - 1 ? 9 : 8].map(q));
      }
      const stuck = (mode === "stall" && w >= 6) || mode === "flat";
      if (mode === "flat") st.reps = lo + Math.floor(rand() * 3);
      else if (!stuck && rand() < 0.7) {
        st.reps++;
        if (st.reps > hi) { st.kg += step; st.reps = lo; }
      }
      if (base === 0) st.reps = Math.min(hi, st.reps);
    }
  }
}
writeFileSync(join(OUT, "imports", "hevy.csv"), rows.map((r) => r.join(",")).join("\n") + "\n");

const body = ["date,time,weight_kg,bodyfat_pct,lean_kg,waist_cm,hips_cm,chest_cm,arm_cm,thigh_cm,calf_cm,neck_cm,note"];
const food = ["date,time,meal,description,kcal,protein_g,carbs_g,fat_g,fiber_g,source"];
const totalDays = Math.round((END - start) / 86400000);
const MEALS = [
  ["breakfast", "Oats with milk, banana and whey", 620, 42, 85, 12],
  ["lunch", "Chicken, rice and vegetables", 780, 52, 95, 18],
  ["snack", "Greek yoghurt, honey and walnuts", 360, 22, 30, 16],
  ["dinner", "Salmon, potatoes and salad", 820, 45, 70, 36],
];
for (let d = 0; d < WEEKS * 7; d++) {
  const day = new Date(start);
  day.setDate(day.getDate() + d);
  if (day > END) break;
  const kg = 74 + d * (0.3 / 7) * 0.74 + Math.sin(d * 1.7) * 0.35 + (rand() - 0.5) * 0.3;
  const m = d % 14 === 0 ? `,${(81 - d * 0.004).toFixed(1)},,,${(35.5 + d * 0.012).toFixed(1)},${(57 + d * 0.006).toFixed(1)},,` : ",,,,,,,";
  if (rand() > 0.12) body.push(`${iso(day)},07:${pad(5 + Math.floor(rand() * 20))},${kg.toFixed(2)},${(17.5 + Math.sin(d / 9) * 0.4).toFixed(1)},${m}`);
  if (d >= totalDays - 28 && rand() > 0.1) {
    const scale = 0.95 + rand() * 0.15;
    for (const [meal, desc, kcal, p, c, f] of MEALS) food.push(`${iso(day)},,${meal},"${desc}",${Math.round(kcal * scale)},${Math.round(p * scale)},${Math.round(c * scale)},${Math.round(f * scale)},,chat`);
  }
}
writeFileSync(join(OUT, "logs", "body.csv"), body.join("\n") + "\n");
writeFileSync(join(OUT, "logs", "food.csv"), food.join("\n") + "\n");

const profile = {
  schema: 1, name: "Alex", language: "en", units: "kg", sex: "male", birth_date: "1998-03-14", height_cm: 178, weight_kg: 74,
  level: "intermediate", training_age_years: 1.5, goal: "muscle_gain", secondary_goals: ["strength"],
  training_days: 4, session_minutes: 75, location: "gym", equipment: ["barbell", "dumbbells", "cables", "machines"],
  injuries: [], avoid_exercises: [], preferred_exercises: ["Deadlift (Barbell)"], weak_points: ["side_delts"], priorities: [],
  daily_steps: 8000, sleep_hours: 7.5,
  nutrition: { tracking: "rough", diet: "omnivore", allergies: [], dislikes: ["mushrooms"], budget: "medium", cooking: "20 min, basic", meals_per_day: 4, cuisine: "Mediterranean", supplements: ["creatine"] },
  screening: { parq_flags: [], cleared_by_professional: null, eating_disorder: false, notes: null },
  guardian_consent: null, pregnant: false, inbox: null, sources: ["hevy"], updated: iso(start),
};
writeFileSync(join(OUT, "profile.json"), JSON.stringify(profile, null, 2) + "\n");
writeFileSync(join(OUT, "goals.json"), JSON.stringify([
  { id: "bench105", type: "lift", title: "Bench press 105 kg (e1RM)", exercise: "Bench Press (Barbell)", target: 105, by: "2027-06-01", created: iso(start), unit: "kg", start: Math.round(firstE1rm["Bench Press (Barbell)"] * 10) / 10 },
  { id: "bw78", type: "bodyweight", title: "Lean bulk to 78 kg", target: 78, by: "2027-03-01", created: iso(start), unit: "kg", start: 74 },
  { id: "pullups12", type: "reps", title: "12 strict pull-ups", exercise: "Pull Up", target: 12, by: "2027-01-31", created: iso(start), unit: "reps", start: 6 },
], null, 2) + "\n");
writeFileSync(join(OUT, "journal.md"), `# Journal\n\n## ${iso(start)} · onboarding\n- Intermediate, 4 days U/L, lean bulk at +0.25 %/week, side delts as a perceived weak point\n`);
console.log(`Demo data written to ${OUT} (${rows.length - 1} sets, ${body.length - 1} weigh-ins, ${food.length - 1} meals)`);
