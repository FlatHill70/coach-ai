# Onboarding

Goal: a complete `profile.json`, the first goals, a first program and nutrition targets, all in **one or two exchanges** where possible. Use `AskUserQuestion` for closed choices. Group questions and never ask more than ~8 things at once. Run `init` first.

## Round 1 — who you are and what you want

1. **Language and units** (infer from how they write; only ask about units if unclear).
2. **Safety screening**: the questions in `safety.md` §1, as one yes/no block. Stop here if a stop-flag appears.
3. **Age** (or birth date), **sex** (male / female / prefer not to say: the engine then averages the BMR formulas), **height**, **weight** (or "I don't know": then ask them to weigh in when they can).
4. **Experience**, to classify the level. Ask what they've done, not "what level are you":
   - Never trained, or not for years → `novice`
   - Under ~1 year of consistent training → `beginner`
   - 1–3 years, still adding weight most months → `intermediate`
   - 3+ years, progress measured in months or blocks → `advanced`
   - Competes (powerlifting, bodybuilding, weightlifting, sport at a high level) → `elite`
   - Cross-check with numbers if they give any (`levels-and-goals.md` › Level markers). Data overrides self-report after 4–6 weeks.
5. **Main goal**, from: build muscle (`muscle_gain`), lose fat (`fat_loss`), both / body recomposition (`recomp`), get stronger (`strength`), health and fitness (`general_health`), endurance or hybrid (`endurance`), performance in a sport (`performance` + `sport`). Ask for a secondary goal too.
6. **What success looks like** in their words. Turn it into 1–3 specific, dated goals (`goals add`).

## Round 2 — logistics and preferences

7. **Days per week and minutes per session**: be realistic. A 3-day plan they follow beats a 6-day plan they abandon.
8. **Where and with what**: commercial gym / home (list equipment: dumbbells up to X kg, bands, pull-up bar, bench, kettlebell) / outdoors / bodyweight only.
9. **Injuries, pain, limitations** (`injuries`), exercises they hate or can't do (`avoid_exercises`), exercises they love (`preferred_exercises`).
10. **Weak points or priorities** they perceive (e.g. "my legs are skinny", "I want a bigger back") → `weak_points` / `priorities`, using muscle-group ids.
11. **Daily activity**: job type, rough daily steps, sleep hours.

## Round 3 — nutrition (adapt depth to their interest)

12. **How they want to handle food** (`nutrition.tracking`):
    - `none`: no counting. Guidance by plates, portions and habits.
    - `rough`: estimates from photos or descriptions logged through chat or a food app.
    - `precise`: weighs and logs everything (MyFitnessPal, Cronometer, MacroFactor, Fud AI…, via Apple Health / Health Connect).
13. **Diet pattern** (omnivore, vegetarian, vegan, pescatarian, halal, kosher, gluten-free, low-FODMAP, other), **allergies and intolerances** (strict), **dislikes**.
14. **Meals per day**, **cooking** (time and skill), **budget**, **cuisine / country** (for realistic foods and shopping lists), and **supplements** they already take.

## Round 4 — data sources (only what they'll use)

15. Which apps they use: Hevy, Strong, another, or none (then they log by chat). For weight: smart scale → Apple Health or Health Connect, manual, or none. For food: an app that writes to Health, chat, or none.
16. Configure the inbox and walk them through the setup in `data-sources.md` for their choices **only**. Save `inbox` and `sources`.

## Save and deliver

- `profile set key=value …` (nested keys with dots: `nutrition.diet=vegan`, lists as JSON: `injuries=["left shoulder"]`). Teens 16–17 who want creatine: also `guardian_consent=...` (see `safety.md`).
- `goals add …` for each goal.
- Deliver, in this order:
  1. A 2–3 line summary of who they are and the plan's logic.
  2. The program (`programming.md`).
  3. Nutrition targets, explained at their tracking level (`nutrition.md`).
  4. What to log and how often.
  5. When the first check-in is (in 7 days).
- First `journal.md` entry: `## <date> · onboarding` with the key decisions.

## Re-onboarding

If the profile is older than 6 months, or the goal or schedule changed, re-ask only what may have changed.
