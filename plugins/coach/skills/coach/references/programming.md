# Programming

## Core variables

- **Volume** (hard sets per muscle per week). The default target range by level is in the engine (`LEVEL_VOLUME`: novice 4–10, beginner 6–12, intermediate 10–18, advanced 12–22, elite 12–25). `profile.volume_targets` overrides it per group. The engine counts 1 set for primary muscles and 0.5 for secondary ones, and excludes warm-ups.
- **Frequency**: each muscle 2×/week or more. Beyond ~8–10 hard sets for one muscle in a session, extra sets add little, so spread them out.
- **Intensity / proximity to failure**: RIR 1–3 on compounds, 0–2 on isolation and machines. Novices and teens use RIR 3 at first (see `safety.md`). Use RPE = 10 − RIR if they log RPE.
- **Rep ranges**: set by goal and by exercise type. Anything from ~6 to ~30 reps builds muscle when sets end close to failure, so pick the range where the exercise loads well and progresses cleanly:

  | Goal | Main compounds | Secondary compounds / machines | Isolation |
  |---|---|---|---|
  | Strength | 3–6 | 6–8 | 8–12 |
  | Muscle gain, recomposition, fat loss | 6–10 | 8–12 | 10–15 (small muscles: 12–20, up to 30) |
  | General health | 8–12 | 10–15 | 12–15 |
  | Endurance | 10–15 | 12–20 | 15–25 |

  Low ranges make load the main progression (weight goes up often). High ranges (isolation, lateral raises, calves) progress mostly through reps, because the smallest load step is a big jump there. Keep strength in a fat-loss phase: the heavy compounds stay in their range.
- **Rest**: by load, not by habit. Heavy sets (1–6 reps): 3–5 min. Compounds at 6–10 reps: 2–3 min. Isolation at 10–15+: 1–2 min (about 90 s). Longer rest mostly helps by keeping reps and load up on the next set, so if reps crash after short rest, rest longer. When time is tight, rest presets are: short ≈ 60–90 s, medium ≈ 90–120 s, long ≈ 2–3 min (save once as `profile set rest_preference=short|medium|long`), and the heavy compounds keep at least medium. Supersets of non-competing muscles save time.
- **Exercise selection**: cover squat/knee-dominant, hinge, horizontal push and pull, vertical push and pull, and carries/core. Choose variations they can load safely and feel in the target muscle, with a stable resistance profile (machines and cables are great for hypertrophy). Keep the main lifts the same for ≥6–8 weeks so progress is measurable. Order each session from the biggest, most demanding lifts to isolation, and follow the order the user is used to when the split names the groups (e.g. a "Back, Biceps" day where they always start with biceps).
- **Swaps**: when the user wants to replace an exercise, offer up to 4 alternatives that train the same muscle with the same pattern (equipment they have, nothing in `injuries`/`avoid_exercises`). "Never suggest it again" → add it to `avoid_exercises`.
- **Starting loads**: from their history, never from a formula. `workouts exercise "<name>"` → last working load; if the last session reached the top of the range at RIR ≥ 2, start one step above. For an exercise they've never logged: start a step or two below a related lift they already do (e.g. incline DB press below their flat DB press), or prescribe "find a weight for the top of the range at RIR 3 in the first session" and log it. Starting weights only suit the reps of the range you prescribe, so state both.

## Progression models

| Model | For | Rule |
|---|---|---|
| Linear | novice, beginner on compounds | Same sets × reps; add the smallest load step every session (lower body) or every 1–2 sessions (upper body) while all reps are clean at RIR ≥1. Failing twice → deload 10% and climb again. |
| Double progression | everyone, default | Fixed range (e.g. 3×8–12). When **all** prescribed sets reach the top **with the same load**, add load (+2.5 kg upper / +5 kg lower, or the smallest dumbbell/machine step) and drop back to the bottom of the range. One set at the top isn't enough: that's the rule Hevy Trainer uses too, so the app's own suggestions and yours agree. |
| RIR/RPE autoregulation | intermediate+ | Prescribe a top set at RPE 8 and back-off sets at −5–10%. Load follows daily readiness. |
| Weekly undulation | intermediate strength | Heavy (3–5 reps), medium (6–8), light (10–12) days for the same lift. |
| Blocks | advanced/elite | Accumulation (more volume, RPE 6–8) 3–5 weeks → intensification (less volume, heavier) 2–4 weeks → realisation/test or deload. |

Bodyweight progressions (home and novices): more reps → harder leverage (incline → floor → decline push-ups; assisted → negative → full pull-ups; split squat → rear-foot elevated → single-leg variations) → slower tempo or pauses → add external load (backpack, vest).

## Stalls

Stall = 3 sessions without beating the previous best e1RM (or reps) on an exercise (`workouts stalled`). Check in this order before swapping the exercise:

0. **Effort**: are the sets actually hard? Identical reps on every set, the same load for weeks with reps far below the range's top, or logged RPE ≤ 6 mean the sets stop well short of failure. First ask for harder sets (the last set at RIR 0–1 on safe exercises), then judge the stall again in 2 sessions.
1. **Energy**: is bodyweight going the intended way? Is protein at target? A deficit explains slower strength.
2. **Recovery**: sleep, stress, illness, a new job, exams.
3. **Volume**: too much (performance dropping across several exercises) or too little (< target for that muscle)?
4. **Execution**: technique drift, range of motion, rest times getting shorter, tempo.
5. **Rep range and load jumps**: is the jump too big? Use smaller plates, or progress reps within a wider range.
6. Only then change the variation (keep the movement pattern, e.g. barbell bench → incline dumbbell press) for one block.

## Deloads

Don't schedule them blindly for novices. Deload when 2+ main lifts drop for 2 weeks, joints ache generally, motivation crashes, or the user is sick or traveling. A deload = 1 week at about 50% of the sets with the same loads, or the same sets at RIR 4–5. Advanced and elite users can plan them every 4–8 weeks at the end of a block.

## Program variety

Ask once how much change they like and save it as `profile set program_variety=block|continuous|varied`:

- **block** (default): 6-week blocks. Main lifts stay; at the end of each block, swap 1–3 accessories for alternatives (same muscle, different angle or equipment) and review volume.
- **continuous**: same exercises until something stalls or the user asks. Best for people who like routine and for tracking long-term progress.
- **varied**: main lifts stay; 1–2 accessories per session rotate every week. Good for motivation, but progress is only measurable on the fixed lifts.

Main lifts never rotate faster than every 6–8 weeks, in any mode.

## Priority muscle

A user can name one muscle group to grow faster (`priorities`). Give it a little more than the rest: +2–4 weekly sets (staying under the level's upper limit), placed early in the session, spread across 2+ days. For more than one or two priorities, or a real lagging group, use the specialisation block in `weak-points.md`.

## Templates (adapt; never paste blindly)

| Days | Default split |
|---|---|
| 2 | Full body A / B |
| 3 | Full body A / B / C, or Upper / Lower / Full |
| 4 | Upper / Lower × 2 |
| 5 | Upper / Lower / Push / Pull / Legs, or U/L/U/L + specialisation day |
| 6 | Push / Pull / Legs × 2 (advanced, good recovery only) |

Session length is capped by `profile.session_minutes`. Estimate about 2.5–3 min per set including rest, plus 10 min of warm-up, and trim isolation work first.

**Home / minimal equipment**: dumbbells + bench + bands + pull-up bar covers everything. Use goblet/split squats, single-leg RDLs, hip thrusts, push-up progressions, dumbbell rows, band pull-aparts and pull-up progressions. With no equipment at all, use the bodyweight progressions above plus a backpack for load.

**Older adults / special populations**: see `safety.md`.

## Working around injuries

- Keep training what doesn't hurt, and train the injured side's healthy neighbours.
- Pain-monitoring rule: pain during or after exercise up to 3/10 that settles by the next morning is acceptable during rehab. Above that, or if it gets worse day to day, stop that movement and refer.
- Swap to a variation with less load on the problem area (e.g. shoulder: neutral-grip, landmine press, cable press; knee: box squat to pain-free depth, leg press partial range, hamstring and glute work; lower back: chest-supported rows, belt squat or leg press, hip thrust instead of deadlifts).
- Never prescribe rehab protocols for a diagnosed injury beyond "follow your physio". You can build the rest of the plan around their physio's instructions.

## Output format for a program

For each day: name, weekday, estimated duration; then exercises with sets × reps @ RIR, rest, the progression rule, and the app name in italics for search. Add a one-line **"why"** under the program, plus the warm-up: 5 min general warm-up, then 2–3 ramp-up sets on the first compound.

For novices, add a 3-line "how to do your first session" and links to reputable technique videos only if the user asks (don't invent URLs).
