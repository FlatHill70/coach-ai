# Recipes from what's in the kitchen

Used by *Cook with what I have*. The goal is a recipe the user can cook tonight with what they have, that fits their targets, and that they haven't seen before.

## Always new

- Read `~/.coach/recipes.md` first. Never repeat a title, and never repeat the combination **main ingredient + method + flavour profile** of any of the last 20 entries.
- Rotate on purpose: cuisine (Spanish, Mediterranean, Mexican, Japanese, Indian, Korean, Middle Eastern, American…), flavour (smoky, citrus, garlic and herbs, spicy, sweet-savoury, curry, miso, mustard), texture (crispy, saucy, stuffed, skewers, bowl, wrap, traybake) and cut (strips, cubes, whole, minced, butterflied).
- The 3 options of step 5 must differ from each other in method or flavour, not just in the garnish.
- Use what they have first. Suggest at most 1–2 extra items, marked "(optional, to buy)".

## Methods, temperatures and times

Times are starting points for typical home appliances. Always give a **doneness check** as well as a time, because appliances vary.

### Air fryer
- Preheat 3 min. Single layer, don't overcrowd; shake or flip halfway.
- Oil: 1 tsp (5 g) sprayed or tossed is enough for most things.

| Food | Temperature | Time |
|---|---|---|
| Chicken breast, whole (~200 g) | 180 °C | 14–18 min, flip at half |
| Chicken breast in cubes or strips | 200 °C | 9–12 min, shake twice |
| Chicken thighs, boneless | 190 °C | 14–18 min |
| Salmon fillet (~150 g) | 200 °C | 8–10 min, skin down |
| White fish fillet | 190 °C | 7–9 min |
| Pork loin steaks (2 cm) | 190 °C | 10–12 min, flip at half |
| Burgers / meatballs | 190 °C | 10–14 min |
| Tofu in cubes (pressed) | 200 °C | 12–15 min |
| Potato or sweet-potato wedges / cubes | 200 °C | 18–22 min, shake twice |
| Peppers, courgette, onion, broccoli | 190 °C | 8–12 min |
| Eggs (hard-boiled style) | 140 °C | 15–16 min, then cold water |

### Griddle / pan (plancha)
- Preheat well on medium-high until a drop of water sizzles. Pat the protein dry. Don't move it until it releases.

| Food | Heat | Time |
|---|---|---|
| Thin chicken fillets (1 cm) | medium-high | 3–4 min per side |
| Chicken breast butterflied (2 cm) | medium | 5–6 min per side |
| Beef steak (2 cm) | high | 2–4 min per side, rest 3 min |
| Pork loin fillets | medium-high | 3 min per side |
| Salmon | medium-high | 4 min skin side, 2–3 min other |
| Prawns | high | 1–2 min per side |
| Eggs, omelette | medium | 2–4 min |
| Vegetables in slices | high | 3–5 min per side |

### Oven
- Preheat fully. Middle shelf. Fan ovens: 10–20 °C lower or a few minutes less.

| Food | Temperature | Time |
|---|---|---|
| Chicken thighs, bone in | 200 °C | 35–45 min |
| Chicken breast, whole | 200 °C | 20–25 min |
| Traybake of chicken pieces + vegetables | 200 °C | 30–40 min, turn once |
| Salmon / white fish | 190 °C | 12–15 min |
| Roast vegetables in chunks | 200 °C | 25–35 min |
| Potatoes in wedges | 210 °C | 35–40 min |
| Meatballs | 200 °C | 18–22 min |
| Baked eggs in a dish | 180 °C | 12–15 min |

## Food safety

- Safe core temperatures: poultry 74 °C · minced meat 71 °C · pork 63 °C + 3 min rest (minced pork 71 °C) · fish 63 °C or flakes easily · whole beef/lamb cuts 63 °C + rest. Without a thermometer, give the visual check (juices clear, no pink in the centre for chicken and mince).
- Meal prep: cool within 2 hours, fridge up to 3–4 days (cooked rice: 1 day if not cooled fast; reheat until steaming). Freeze portions for longer.
- Separate board for raw meat. Never wash raw chicken.
- Allergies are strict: no "a little" of an allergen, and flag cross-contamination risks in ready-made products (sauces, spice mixes).

## Nutrition

- Use standard food-composition values per 100 g (BEDCA for Spain, USDA elsewhere, or the label if the user gives it). Say whether each weight is **raw or cooked** (meat, rice and pasta are listed raw unless stated).
- Count **all** the oil, butter and sauce used for cooking: 1 tablespoon of oil ≈ 10 g ≈ 90 kcal; 1 teaspoon ≈ 5 g ≈ 45 kcal.
- Round kcal to the nearest 5 and grams of macros to 1. Totals are the sum of the ingredients; per serving = total ÷ servings. State that the numbers are estimates (±10–15 %).
- Fibre when it's relevant (legumes, vegetables, wholegrains).
- Summary against the user's targets (`nutrition targets`): share of daily kcal and protein, and whether the serving reaches `proteinPerMeal_g`. Offer one swap that fixes the biggest gap (e.g. +50 g chicken for +15 g protein).
- With `nutrition.tracking` = `none`, also give the plate version: palms of protein, fists of carbs and vegetables, thumbs of fat.

## Output format

Keep it readable on a phone: short lines, no wide tables except the nutrition one (4–5 short columns).

```
Smoky chicken and pepper strips · air fryer
2 servings · 25 min (10 prep + 15 cooking) · high protein

Ingredients
• 400 g chicken breast, raw (2 medium breasts)
• 2 peppers, 300 g
• 1 onion, 120 g
• 10 g olive oil (1 tablespoon)
• 1 tsp smoked paprika, 1/2 tsp garlic powder, salt
• 160 g rice, raw (2 small cups), or 2 microwave pouches

Steps
1. Rice: boil 12 min (or microwave the pouches 2 min).
2. Cut the chicken into strips and the vegetables into 1 cm strips. Toss with the oil and spices.
3. Air fryer at 200 °C, 3 min preheat. Cook 12–14 min, shaking at 5 and 10 min.
4. Done when the thickest strip is white inside (74 °C).

Nutrition (whole recipe)
Ingredient            kcal   P    C    F
Chicken breast 400 g   440  92    0    6
Peppers 300 g           80   3   15    1
Onion 120 g             50   1   11    0
Olive oil 10 g          90   0    0   10
Rice raw 160 g         570  11  125    1
Total                 1230 107  151   18
Per serving            615  54   76    9

Summary
• Per serving: 615 kcal, 54 g protein: about 24 % of your 2,530 kcal and half your daily protein.
• Above your 26 g per-meal protein target: good for muscle gain.
• Want it lighter? Half the rice: −140 kcal per serving.
```
