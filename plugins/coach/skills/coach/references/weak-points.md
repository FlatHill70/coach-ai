# Weak points and lagging muscle groups

A "weak point" is a muscle group (or lift component) that lags **relative to the rest of the user**, in size, strength or balance, and that matters for their goal. Most beginners don't have weak points. They have low overall volume or inconsistent training. Fix that first.

## 1. Collect the signals

`workouts balance --weeks 4` gives you:

- `globalFlags`: most groups are below the level target. Then the fix is **overall consistency and volume**, not specialisation. Say so and stop here.
- `avgSetsPerWeek` + `candidates`: groups trained much less than the median group, or below their target.
- `ratios`: pull:push sets (healthy ≥ 1.0), hamstrings:quads (≥ 0.6), rear:front delts (≥ 0.5), direct side-delt sets.
- `groupStrengthTrend8Weeks`: %/week change of e1RM (or reps) per group. A group stuck while others climb is a signal.
- `strengthRatios`: OHP/bench (typical 0.6–0.72), row/bench (0.75–1.05), deadlift/squat (1.1–1.3), front/back squat (0.8–0.9). These need the barbell lifts logged recently.
- `relativeStrength`: bodyweight multiples vs rough population bands.

Add what the engine can't see:

- **What the user perceives** (`profile.weak_points`) and what they want (`priorities`). Their goal decides what "matters".
- **Measurements** (`body measures`): e.g. arms flat for 8+ weeks while body weight rises.
- **Photos**: if the user shares photos, describe visible proportions neutrally and never comment on attractiveness. Always treat photos as low-precision evidence (lighting, pump, posture).
- **Technique and feel**: where they feel an exercise (e.g. rows felt only in the biceps → back under-stimulated), the limiting factor in a lift (e.g. bench stalls off the chest → pecs/strength from the bottom; lockout → triceps).

Rank the candidates: (a) relevance to their goal, (b) agreement between signals (volume + trend + perception > a single signal), (c) injury-risk relevance (e.g. very low pull:push or hamstrings:quads ratios matter even if not visible).

## 2. Diagnose the lift, not just the muscle (strength goals)

| Lift fails… | Likely limiter | Accessory focus |
|---|---|---|
| Squat out of the hole / folding forward | quads, upper back | front squat, pause squat, leg press, high-bar, upper-back work |
| Squat mid-range | general strength, bracing | pin squats, tempo squats, core bracing |
| Bench off the chest | pecs, front delts, starting strength | paused bench, wider grip, dumbbell press, flyes |
| Bench at lockout | triceps | close-grip bench, dips, overhead triceps extension |
| Deadlift off the floor | quads, position | deficit deadlift, paused deadlift, front squat |
| Deadlift at the knees/lockout | glutes, hamstrings, upper back | RDL, hip thrust, rows, block pulls |
| Overhead press | delts, triceps, upper back | push press (technique), seated DB press, lateral raises |
| Pull-ups | lats, grip, bodyweight | weighted/negative pull-ups, lat pulldown, rows |

## 3. Prescribe a specialisation block

1. **Choose at most 1–2 priority groups** per block (6–8 weeks).
2. **Raise their volume** by +4–6 sets/week over current (not over the generic target), up to the top of their level's range, spread over **2–3 sessions per week**.
3. **Put them first** in the session, when the user is fresh.
4. **Pay for it**: drop non-priority groups to maintenance (~⅓ to ½ of their usual sets, keeping the intensity). Total weekly sets should rise ≤10%.
5. **Pick 2 exercises** for the priority group with different strength curves (e.g. lateral raise: cable + machine; hamstrings: seated curl + RDL). Bias toward the lengthened position (stretch-loaded movements tend to work well for hypertrophy).
6. **Track** the priority's exercises with `workouts exercise` and a measurement (`goals add --type measure`), and review at every check-in. After the block, return to balanced volume, or rotate to the next priority.

Imbalances between sides: add unilateral work. Start with the weaker side, and the stronger side matches its reps (not more). A small asymmetry is normal. Pain or a large sudden difference → refer to a physio.

## 4. Structural balance (everyone, even beginners)

These are not "weak points" but defaults that prevent typical problems:

- Weekly pull sets ≥ push sets. Include rear delts and external rotation work if they press a lot.
- Hamstrings trained with both a hip hinge and a knee flexion movement.
- Some direct calf, core and grip work for most goals.
- Single-leg work at least once a week (balance, knee and hip health).

## 5. Say it clearly

Report in this order:
1. The main finding with its numbers.
2. Why it matters for *their* goal.
3. The block: what changes, for how many weeks, and what goes to maintenance.
4. How you'll measure it.

One paragraph plus the updated program days. Don't produce a page of ratios.
