# iOS Shortcut: Apple Health → Coach

It writes the last 60 days of body and food data from Apple Health to `iCloud Drive/Coach/coach_health.txt`, overwriting the file each time, so running it often is harmless. It works with **any** scale or app that writes to Health: Withings, Xiaomi, Renpho, Eufy, Garmin, MyFitnessPal, Cronometer, MacroFactor, Lose It!, Fud AI…

Each line: `kind;date;value;unit`, e.g. `weight;2026-10-05T07:12:00+02:00;72.4;kg`.

## Build it (Shortcuts app › Shortcuts › +), name: **Health to Coach**

Build one block per metric you want. Start with weight. The others are optional.

**Weight block**
1. **Find Health Samples** → Type: *Weight* · *Start Date is in the last 60 days* · Sort by *Start Date* · *Oldest First* · no limit.
2. **Repeat with Each** item in *Health Samples*.
3. Inside the loop, a **Text** action: `weight;` *Repeat Item › Start Date* `;` *Repeat Item › Value* `;` *Repeat Item › Unit*.
   - Tap the *Start Date* variable → Date Format: **ISO 8601**, enable **Include Time**.
4. Inside the loop, **Add to Variable** → *Text* → variable **Lines**.
5. End Repeat.

**More blocks** (long-press the block › Duplicate, then change the Type and the text prefix):

| Health type (menu name) | Prefix |
|---|---|
| Body Fat Percentage | `bodyfat;` |
| Lean Body Mass | `lean;` |
| Dietary Energy (Nutrition) | `kcal;` |
| Protein | `protein;` |
| Carbohydrates | `carbs;` |
| Total Fat | `fat_g;` |
| Steps | `steps;` |

**Save**
6. **Combine Text** → *Lines* with *New Lines*.
7. **Set Name** → *Combined Text* → `coach_health.txt`.
8. **Save File** → destination **iCloud Drive › Coach** · *Ask Where to Save* OFF · **Overwrite If File Exists** ON.

Pick the types from the menu on the phone. Don't import shortcuts generated on a computer: a type that iOS doesn't recognise makes it fail with "No health samples found".

If a type has **no samples at all** (e.g. you never logged food), the whole shortcut stops at that block. Remove blocks you don't use.

## First run (required)

Tap ▶︎ once. iOS asks for permission to read each type: **Allow**. Without this, the automation fails silently.

## Automation (Automation tab › +)

1. **App** → choose your scale's app (and your food or workout app) → **Is Closed**.
2. **Run Immediately**, notifications off.
3. Next → **Health to Coach**.

Why "on app close" and not a fixed time: iOS doesn't let Shortcuts read Health while the phone is locked. When the scale app closes, the phone is unlocked and the new weigh-in is already in Health.

## Language

Menu names are localised (e.g. Spanish: *Buscar muestras de salud*, *Peso*, *Porcentaje de grasa corporal*). The prefixes in the text must stay as listed. Spanish prefixes (`peso`, `grasa`, `magra`, `proteina`) are also accepted for compatibility.
