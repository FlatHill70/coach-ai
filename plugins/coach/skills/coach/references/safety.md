# Safety, screening and special populations

This skill coaches healthy people and adapts for everyone else. It is **not** a medical service. The rule is: *screen → adapt → refer when needed*. Don't refuse to help. Change what you prescribe and say who should confirm it.

## 1. Pre-exercise screening (PAR-Q+ style)

Ask during onboarding, in plain words, as one block. Store the answers in `profile.screening.parq_flags` (a short tag for each "yes").

1. Has a doctor ever said you have a heart condition or high blood pressure? → `heart`
2. Do you get chest pain at rest, during daily activities, or when exercising? → `chest_pain`
3. Do you lose balance from dizziness, or have you lost consciousness in the last 12 months? → `dizziness`
4. Have you been diagnosed with another chronic condition, such as diabetes, asthma, epilepsy, osteoporosis or kidney disease? → `chronic:<name>`
5. Do you take prescribed medication for a chronic condition? → `medication`
6. Do you have a bone, joint or soft-tissue problem (or surgery in the last 12 months) that could get worse with exercise? → `msk:<where>`
7. Has a doctor said you should only do medically supervised activity? → `supervised_only`
8. Are you pregnant or have you given birth in the last 12 months? → set `pregnant` / `postpartum`
9. Have you ever had, or do you currently have, an eating disorder? → `screening.eating_disorder = true` (ask gently and make it optional)

### What each answer changes

| Flag | Action |
|---|---|
| `chest_pain`, `dizziness`, `supervised_only`, or uncontrolled `heart` | **Stop before programming.** Tell them to get medical clearance first. You may give general education and walking advice only. Once they say they're cleared, set `screening.cleared_by_professional = true` and continue conservatively. |
| controlled `heart`, `chronic:*`, `medication` | Recommend clearance (don't require it). Start at RIR 3–4 and avoid maximal efforts and long breath-holding (Valsalva). Build progression slowly. Diabetes: tell them to check their glucose around sessions and keep fast carbs to hand. |
| `msk:*` | Program around the area (`references/programming.md` › Working around injuries). Pain during an exercise is a stop signal for that exercise, and a physio should guide the rehab. |
| `pregnant` / `postpartum` | No calorie deficit. Avoid lying flat on the back after the first trimester, contact and fall-risk activities, and maximal lifts. Moderate effort ("can talk"). Their midwife/OB confirms the plan. Postpartum: pelvic-floor-aware return, guided by their provider. |
| `eating_disorder` | No deficits, no weighing targets and no detailed food tracking unless their clinician is involved. Focus on performance and regular meals. Don't comment on body shape. |

Red flags at **any** time: chest pain, fainting, unusual breathlessness, palpitations, sudden severe headache, numbness or radiating pain, or acute joint pain with swelling. Tell them to stop and seek medical care, and don't carry on with the plan in that conversation.

## 2. Teen mode (13–17)

Strength training is safe and beneficial for adolescents when technique and progression are supervised. Major paediatric and strength-and-conditioning bodies (AAP, NSCA, ACSM) endorse it. Teens get a full program, adapted like this:

- **Technique before load.** The first 4–8 weeks use moderate loads, RIR 3+, and focus on learning the movements (squat, hinge, push, pull, carry, lunge). Progress load only when technique holds on every rep.
- **No 1RM testing** and no sets to failure on heavy compound lifts. Use rep-range progressions instead (e.g. 3×8–12).
- **Supervision**: recommend a qualified coach, PE teacher or experienced adult for the first weeks, and a spotter on bench and squat.
- **Sleep and growth first**: 8–10 h of sleep. If they play other sports, count that load and keep the gym at 2–4 sessions per week.
- **Nutrition**: no calorie deficits and no "cutting". The engine maps `fat_loss` to maintenance with healthy habits. The focus is eating enough, regular meals and protein from food (1.4–2.0 g/kg). Don't count calories to the gram unless they ask, and never set weight-loss targets.
- **Body image**: don't push body-fat %, "shredding" or comparisons. Talk about strength, energy, sport and consistency. If you see ED signals (fear of eating, very low intake, compensatory exercise, distress about weight), stop the nutrition advice and suggest talking to a parent/guardian and a professional.
- **Supplements**: food first. Protein powder only as a convenience when food can't cover the need.
  - **Creatine at 16–17**: may be discussed only with guardian consent recorded in `profile.guardian_consent`. Use the standard 3–5 g/day monohydrate dose, no loading phase, and say clearly that research in adolescents is limited and that paediatric bodies (AAP) advise against performance supplements for minors. Without recorded consent, don't recommend it.
  - **Under 16**: no creatine.
  - **Any minor**: no pre-workouts, no "fat burners", no other ergogenic aids, no stimulants.
- **Under 13**: no gym program. Recommend play, sport, bodyweight skills and supervised youth training through school/clubs, and suggest a parent/guardian reads along.

## 3. Older adults (60+)

Very beneficial: strength, muscle and balance protect independence. Start at RIR 3–4 and use machines and supported variations. Include balance and power work (controlled-fast concentric) once the basics are solid. Protein 1.2–1.6 g/kg spread across meals. Screen carefully (section 1). Osteoporosis: progressive loading is helpful, but avoid loaded spinal flexion and twisting until a professional okays it.

## 4. Other situations

- **Very high BMI (>35)**: low-impact options (bike, pool, walking, machines). Protein is based on reference weight (the engine does this). Celebrate non-scale wins.
- **Underweight (BMI < 18.5)**: no deficit (the engine enforces this). Gain at 0.25–0.5 %/week.
- **Disability / limb difference / wheelchair users**: adapt exercise selection to what they can load safely and ask about their own experience. Unilateral and seated variations work, and the progression rules are the same.
- **Medication that affects heart rate (beta-blockers)**: use RPE/RIR, not heart rate, for intensity.
- **Shift workers / poor sleep**: lower volume and expectations, and keep sessions short and consistent.

## 5. Performance-enhancing drugs

Don't give dosing, cycles or sourcing. If the user uses them, stay non-judgemental. Keep coaching training and nutrition, and recommend medical monitoring (blood work, blood pressure). Note that their progress rates won't match the natural benchmarks in this skill.
