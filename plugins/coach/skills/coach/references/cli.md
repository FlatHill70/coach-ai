# Engine reference (`scripts/coach.mjs`)

`node "${CLAUDE_SKILL_DIR}/scripts/coach.mjs" <area> <command> [--flag value]` · JSON on stdout · errors as `{"error": "..."}` on stderr with exit code 2 · Node.js 20+ (Health Connect needs 22.13+). Data: `~/.coach/` or `$COACH_HOME`.

## Files in `~/.coach/`

| File | What |
|---|---|
| `profile.json` | Profile (schema below) |
| `goals.json` | Goals |
| `journal.md` | Check-in log you write by hand (template in SKILL.md) |
| `exercises.custom.json` | User's custom exercises (override the catalogue) |
| `imports/` | `hevy.csv`, `strong.csv`, `apple_health.txt`, `health_connect.db` (written by `sync`) |
| `logs/` | `workouts.csv`, `body.csv`, `food.csv` (written by the `log` commands) |

## Commands

| Command | Use |
|---|---|
| `init` | Create the folder, empty profile and goals |
| `status` | Profile summary, last workout / weigh-in / food, goals, update check |
| `profile show` | Profile + computed `age` and `adolescent` |
| `profile set k=v …` | Set fields; dots for nesting (`nutrition.diet=vegan`), JSON for lists (`injuries=["knee"]`), `null` to clear |
| `sync [--from <file>]` | Import the newest Hevy/Strong CSV, iOS Shortcut file and Health Connect export from the inbox (or one file) |
| `workouts info` | Sources, dates, `unmapped` exercises |
| `workouts summary [--weeks 4]` | Sessions, minutes, hard sets per muscle group per week, status vs target |
| `workouts last [--n 1]` | Last N sessions, each exercise vs the previous time (`change` in %) |
| `workouts exercise "<name>" [--last 12]` | History, best, 8-week trend (%/week). Name in any language, partial |
| `workouts records` | Best score per exercise |
| `workouts stalled [--sessions 3]` | Exercises with no new best in N sessions |
| `workouts balance [--weeks 4]` | Weak-point signals (see `weak-points.md`) |
| `workouts log --exercise "<key>" --sets "60x8,60x8@9" [--warmup "40x10"] [--date] [--time] [--title] [--minutes] [--unit] [--notes]` | Log sets by chat. Sets: `60x8`, `60kgx8`, `135lbx5`, `@RPE`, `12` (reps only), `45s`, `2:30` |
| `body weight [--days 42]` | Last weigh-in, weekly averages, weekly change, 28-day trend, body fat, lean mass |
| `body log [--weight] [--bodyfat] [--lean] [--waist] [--hips] [--chest] [--arm] [--thigh] [--calf] [--neck] [--date] [--time] [--note] [--length-unit cm\|in]` | Log a weigh-in and/or measurements |
| `body measures [--last 8]` | Measurement history and change |
| `body info` | What health data was found, and its age |
| `nutrition targets [--goal] [--rate] [--activity] [--weight]` | BMR, maintenance (formula + adaptive), calories, macros, fibre, water, safety `flags`. Flags let you simulate other goals |
| `nutrition days [--days 14]` | Daily totals, 7-day average of complete days, targets |
| `nutrition log --kcal --protein [--carbs] [--fat] [--fiber] [--meal] [--desc] [--date] [--time]` | Log a meal |
| `nutrition tdee` | Adaptive maintenance from intake + weight trend |
| `goals progress` | Each goal: start, current, target, % done, trend/week, ETA, on track |
| `goals add --type lift\|reps\|bodyweight\|bodyfat\|measure\|sessions\|custom --target N [--exercise] [--measure waist] [--by YYYY-MM-DD] [--title]` | Add a goal (start value captured automatically) |
| `goals update <id> [--target] [--by] [--title] [--current] [--archive]` | Edit, record progress on custom goals, archive |
| `exercises find "<text>"` | Search the catalogue (any language) |
| `exercises groups` | Valid muscle-group ids |
| `exercises add "<logged name>" --primary a,b [--secondary c] [--en] [--es] [--<lang> "name"] [--bodyweight] [--cardio] [--alias "x,y"]` | Custom exercise |
| `exercises list` / `exercises remove "<name>"` | Manage custom exercises |
| `update [--force]` | Compare installed version with the latest GitHub release |

## Metrics

- **Score** per session = best e1RM (Epley: `kg × (1 + reps/30)`) for loaded sets. For bodyweight sets it's max reps, and for timed sets it's max seconds. Assisted machines are reported but excluded from stall detection.
- **Hard sets** exclude warm-ups. Primary muscles count 1, secondary 0.5.
- **Weeks** start on Monday. Averages use complete weeks only.
- **Weight trend** = linear regression over 28 days of daily first weigh-ins.

## `profile.json` schema

```json
{
  "schema": 1, "name": "Alex", "language": "en", "units": "kg",
  "sex": "male|female|null", "birth_date": "2007-04-12", "age": null, "height_cm": 178, "weight_kg": 74, "bodyfat_pct": null,
  "level": "novice|beginner|intermediate|advanced|elite", "training_age_years": 0.5,
  "goal": "muscle_gain|fat_loss|recomp|strength|general_health|endurance|performance|maintenance",
  "secondary_goals": [], "sport": null,
  "training_days": 4, "session_minutes": 60, "location": "gym|home|both|outdoors", "equipment": ["barbell", "dumbbells", "cables", "machines"],
  "injuries": [], "avoid_exercises": [], "preferred_exercises": [],
  "weak_points": ["side_delts"], "priorities": ["upper_back"], "volume_targets": { "side_delts": [10, 16] },
  "activity": "sedentary|light|moderate|very|extreme|null", "daily_steps": 8000, "sleep_hours": 7.5,
  "rate_pct_per_week": null,
  "nutrition": { "tracking": "none|rough|precise", "diet": "omnivore", "allergies": [], "dislikes": [], "budget": "low|medium|high", "cooking": "15 min, basic", "meals_per_day": 4, "cuisine": "Spanish", "supplements": ["creatine"] },
  "screening": { "parq_flags": [], "cleared_by_professional": null, "eating_disorder": false, "notes": null },
  "guardian_consent": null, "pregnant": false,
  "inbox": "~/iCloudDrive/Coach", "sources": ["hevy", "apple_health"], "strong_unit": null,
  "updated": "2026-10-05"
}
```
