#!/usr/bin/env node
import { parseArgs, UserError } from "./lib/common.mjs";

const USAGE = `coach — data engine for the Coach skill. Every command prints JSON.

  init                                   create ~/.coach (or $COACH_HOME)
  status                                 freshness of every data source + update check
  latest                                 the most recent record of each kind (workout, weigh-in, food) and what is stale
  profile show | set key=value ...       read / edit profile.json
  sync [--from <file>]                   import new Hevy/Strong CSV, iOS Shortcut file, Health Connect export from the inbox
  workouts info|summary|last|exercise|records|stalled|balance|log
  body weight|log|measures|info
  nutrition targets|days|log|tdee
  goals progress|add|update
  exercises list|find|groups|add|remove
  update [--force]                       check GitHub for a newer release
`;

const [area, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

async function run() {
  switch (area) {
    case "init": return (await import("./lib/system.mjs")).cmdInit();
    case "status": return (await import("./lib/system.mjs")).cmdStatus();
    case "latest": return (await import("./lib/system.mjs")).cmdLatest();
    case "sync": return (await import("./lib/system.mjs")).cmdSync(args);
    case "profile": return (await import("./lib/system.mjs")).cmdProfile({ ...args, _: ["profile", ...args._] });
    case "update": return (await import("./lib/system.mjs")).checkUpdate({ force: Boolean(args.force) });
    case "workouts": return (await import("./lib/workouts.mjs")).cmdWorkouts(args);
    case "body": return (await import("./lib/body.mjs")).cmdBody(args);
    case "nutrition": return (await import("./lib/nutrition.mjs")).cmdNutrition(args);
    case "goals": return (await import("./lib/goals.mjs")).cmdGoals(args);
    case "exercises": return (await import("./lib/exercises.mjs")).cmdExercises({ ...args, _: ["exercises", ...args._] });
    default:
      process.stdout.write(USAGE);
      process.exit(area ? 1 : 0);
  }
}

try {
  console.log(JSON.stringify(await run(), null, 1));
} catch (e) {
  if (e instanceof UserError) { console.error(JSON.stringify({ error: e.message })); process.exit(2); }
  throw e;
}
