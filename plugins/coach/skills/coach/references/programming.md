# Programming

## Core variables

- **Volume** (hard sets per muscle per week). The default target range by level is in the engine (`LEVEL_VOLUME`: novice 4–10, beginner 6–12, intermediate 10–18, advanced 12–22, elite 12–25). `profile.volume_targets` overrides it per group. The engine counts 1 set for primary muscles and 0.5 for secondary ones, and excludes warm-ups.
- **Frequency**: each muscle 2×/week or more. Beyond ~8–10 hard sets for one muscle in a session, extra sets add little, so spread them out.
- **Intensity / proximity to failure**: RIR 1–3 on compounds, 0–2 on isolation and machines. Novices and teens use RIR 3 at first (see `safety.md`). Use RPE = 10 − RIR if they log RPE.
- **Rest**: 2–3 min for compounds, 1–2 min for isolation. Supersets of non-competing muscles save time.
- **Exercise selection**: cover squat/knee-dominant, hinge, horizontal push and pull, vertical push and pull, and carries/core. Choose variations they can load safely and feel in the target muscle, with a stable resistance profile (machines and cables are great for hypertrophy). Keep the main lifts the same for ≥6–8 weeks so progress is measurable.

## Progression models

| Model | For | Rule |
|---|---|---|
| Linear | novice, beginner on compounds | Same sets × reps; add the smallest load step every session (lower body) or every 1–2 sessions (upper body) while all reps are clean at RIR ≥1. Failing twice → deload 10% and climb again. |
| Double progression | everyone, default | Fixed range (e.g. 3×8–12). When **all** sets reach the top, add load (+2.5 kg upper / +5 kg lower, or the smallest dumbbell/machine step) and drop back to the bottom of the range. |
| RIR/RPE autoregulation | intermediate+ | Prescribe a top set at RPE 8 and back-off sets at −5–10%. Load follows daily readiness. |
| Weekly undulation | intermediate strength | Heavy (3–5 reps), medium (6–8), light (10–12) days for the same lift. |
| Blocks | advanced/elite | Accumulation (more volume, RPE 6–8) 3–5 weeks → intensification (less volume, heavier) 2–4 weeks → realisation/test or deload. |

Bodyweight progressions (home and novices): more reps → harder leverage (incline → floor → decline push-ups; assisted → negative → full pull-ups; split squat → rear-foot elevated → single-leg variations) → slower tempo or pauses → add external load (backpack, vest).

## Stalls

Stall = 3 sessions without beating the previous best e1RM (or reps) on an exercise (`workouts stalled`). Check in this order before swapping the exercise:

1. **Energy**: is bodyweight going the intended way? Is protein at target? A deficit explains slower strength.
2. **Recovery**: sleep, stress, illness, a new job, exams.
3. **Volume**: too much (performance dropping across several exercises) or too little (< target for that muscle)?
4. **Execution**: technique drift, range of motion, rest times getting shorter, tempo.
5. **Rep range and load jumps**: is the jump too big? Use smaller plates, or progress reps within a wider range.
6. Only then change the variation (keep the movement pattern, e.g. barbell bench → incline dumbbell press) for one block.

## Deloads

Don't schedule them blindly for novices. Deload when 2+ main lifts drop for 2 weeks, joints ache generally, motivation crashes, or the user is sick or traveling. A deload = 1 week at about 50% of the sets with the same loads, or the same sets at RIR 4–5. Advanced and elite users can plan them every 4–8 weeks at the end of a block.

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
