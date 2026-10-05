# Nutrition system

Four layers. Use only the ones the user wants (`profile.nutrition.tracking`):

1. **Targets**: calories, protein, fat, carbs and fibre for their goal (`nutrition targets`).
2. **Feedback loop**: weekly adjustment from the real weight trend (and intake, if logged).
3. **Food guidance**: plates/portions (`none`), estimated logging (`rough`), or exact grams (`precise`).
4. **Planning**: meal plans, recipes and shopping lists built from their constraints.

## 1. Targets — how the engine computes them

- **BMR**: Mifflin-St Jeor, averaged with Katch-McArdle when `bodyfat_pct` is known. Sex "prefer not to say" → average of both formulas.
- **Maintenance (TDEE)**: BMR × activity (from `activity`, or estimated from training days and daily steps). Once there are ≥10 fully logged days and ≥8 weigh-ins in 28 days, the **adaptive TDEE** (`intake − weight change × 7,700 kcal/kg`) blends in or takes over. Trust the adaptive number over the formula.
- **Goal rate** (% bodyweight/week): muscle gain +0.25–0.5 (novice/beginner) down to +0.05–0.2 (elite); fat loss −0.5–0.75 (lean/advanced: −0.3–0.6); recomp, health and endurance at 0; strength 0 to +0.25. `profile.rate_pct_per_week` overrides it.
- **Guards** (enforced by the engine and listed in `flags`): no deficit under 18, during pregnancy or breastfeeding, below BMI 18.5, or with an ED history. Deficit capped at 25% of TDEE. Calorie floor ≈ max(BMR × 1.05, 1,200 F / 1,500 M).
- **Protein** g/kg: fat loss and recomp 1.8–2.4; gain and strength 1.6–2.2; health 1.2–1.8; teens 1.4–2.0. BMI > 30 → per kg of reference weight (BMI 27). Spread over 3–5 meals of ~0.3–0.5 g/kg each.
- **Fat**: ≥ 0.7 g/kg and ≥ 25% of calories as a default floor. **Carbs**: the rest (endurance: check 5–7 g/kg on hard days). **Fibre** 14 g per 1,000 kcal. **Water** ~35 ml/kg plus sweat losses.

Explain targets as ranges and in their language. With `tracking: none`, translate them into plates: per meal, 1–2 palms of protein, 1–2 fists of vegetables, 1–2 cupped hands of carbs, 1–2 thumbs of fats, adjusted to the target.

## 2. Weekly adjustment (the feedback loop)

At each check-in, compare `body weight` › `trend28Days.pctPerWeek` with the target rate:

| Situation (2+ consecutive weeks) | Adjustment |
|---|---|
| Gaining slower than target | +100–200 kcal/day (mostly carbs) |
| Gaining faster than target (beginner > 0.75 %/wk, others > 0.5) | −100–150 kcal/day |
| Losing slower than target, with good adherence | −100–200 kcal/day, or +2,000–3,000 steps/day |
| Losing faster than target, or strength dropping | +100–200 kcal/day |
| On target | No change. Say so. |

- Before changing calories, check adherence (logged days, weekends, alcohol, liquid calories) and water noise: salty meals, creatine start (+1–2 kg of water), menstrual cycle (compare the same cycle phase), new training stress, travel.
- With `tracking: none`, translate kcal changes into food. +200 kcal ≈ a banana + 30 g oats, a glass of milk + a handful of nuts, or a larger rice portion at lunch and dinner. −150 kcal ≈ swap a sugary drink, halve the cooking oil, or a smaller dessert.
- Never adjust from a single weigh-in, and never more than once every 2 weeks.

## 3. Food guidance and logging

- **Estimating from descriptions or photos**: use typical portions for their cuisine. State the estimate and your confidence ("~650 kcal, 40 g protein — could be ±25%"), then `nutrition log`. Ask for a clarification only when it moves the estimate a lot (oil, sauces, portion of rice/pasta, drinks).
- **Quality**: mostly minimally processed foods, protein at every meal, 2+ fruits and 3+ vegetable portions a day, whole grains and legumes, enough calcium, iron and omega-3s. No "clean/dirty" moralising: 80–90% quality is enough.
- **Around training**: a meal with protein and carbs 1–3 h before. Protein 0.3–0.5 g/kg within a few hours after. Very early sessions: something light (fruit, yoghurt) is fine.
- **Eating out, social life, alcohol**: plan, don't forbid. Pick a protein-centred dish, take the sauce on the side, and drink water between alcoholic drinks. Alcohol ≈ 7 kcal/g and it hurts sleep and recovery.

## 4. Diet patterns and constraints

- **Allergies and intolerances are hard constraints**. Never include the allergen, and flag cross-contamination risks in recipes (e.g. oats/gluten, nut oils). Coeliac disease → certified gluten-free.
- **Vegetarian/vegan**: aim for the top of the protein range. Combine legumes, soy (tofu, tempeh, soy milk), seitan, dairy/eggs if vegetarian, and pea/soy protein powder. Vegans: B12 supplement is required; check vitamin D, iodine, omega-3 (algae oil), calcium, iron and zinc.
- **Halal / kosher / religious fasting** (e.g. Ramadan): respect the rules. During fasting, put protein at suhoor and iftar, hydrate between, train shortly before iftar or after it, and lower volume temporarily.
- **Medical diets** (diabetes, kidney disease, IBS/low-FODMAP, pregnancy): their clinician or dietitian decides the targets. You only organise meals inside those rules.
- **Budget**: rely on eggs, milk/yoghurt, canned fish, chicken thighs, legumes, oats, rice, potatoes, frozen vegetables and seasonal fruit. Batch-cook, and give rough costs in their currency only if you know local prices well (otherwise say "cheap / medium").

## 5. Meal plans

Inputs: targets, meals per day, diet, allergies, dislikes, cuisine/country, cooking time and skill, budget, training times, and who they cook for.

Rules:
- Plan **3–4 days of rotation** for a week, not 7 unique days (adherence and shopping). Use leftovers on purpose.
- Every meal hits its protein share. The daily total lands within ±5% of calories and inside the protein range.
- Give each meal as: name — ingredients with amounts in their units — kcal / P / C / F — prep time. Recipes in ≤5 short steps.
- Offer 2 swaps per meal (same macros ± 10%).
- With `tracking: none`, give the same plan as portions or plates, without numbers unless they ask.

## 6. Shopping list

Built from the plan, for N days and N people. Group by supermarket section (produce, protein, dairy, pantry, frozen, other), give total quantities in practical units (packs, cans, kg), mark items already in the pantry, and add batch-cooking steps for the weekend if they want.

## 7. Supplements (evidence tiers)

- **Strong evidence**: creatine monohydrate 3–5 g/day, no loading needed (warn about +1–2 kg of water at the start); protein powder as food convenience; caffeine 3–6 mg/kg before training if tolerated (not after mid-afternoon); vitamin D if deficient or with little sun; vegans B12.
- **Context-dependent**: omega-3 if little fish; iron only if tested low; beta-alanine and nitrate/beetroot for specific endurance or high-rep efforts.
- **Not recommended**: fat burners, testosterone boosters, BCAAs when protein is adequate, "detox" products.
- **Teens**: see `safety.md` › Teen mode (creatine only at 16–17 with recorded guardian consent; no stimulants or pre-workouts).
- Medication interactions, pregnancy and medical conditions → pharmacist or doctor first.
