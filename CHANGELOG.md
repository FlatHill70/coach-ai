# Changelog

## [1.2.0](https://github.com/FlatHill70/coach-ai/compare/v1.2.0...v1.2.0) (2026-10-06)


### Features

* coach engine, skill and references ([86067f2](https://github.com/FlatHill70/coach-ai/commit/86067f29f75e0c383fa7c46804a1e0b6584a8eec))
* guided modes to see the latest records and copy Hevy workouts by hand ([dbf540e](https://github.com/FlatHill70/coach-ai/commit/dbf540e27d749b22eb49405666d22b3d4fdc8b90))
* guided update, Coach updates and recipes from what's in the kitchen ([8f974fc](https://github.com/FlatHill70/coach-ai/commit/8f974fc75c72ad931a1367612da6e407e2ef5fcc))
* latest command and Hevy workouts copied by hand without duplicates ([bc6aa3d](https://github.com/FlatHill70/coach-ai/commit/bc6aa3de4c938a451572f7244917e46c7608a72d))
* release pipeline, installers and documentation ([4dfb4b1](https://github.com/FlatHill70/coach-ai/commit/4dfb4b1342a74961b0a333f2d993996147c5bebc))
* update --install, profile review and sync from a folder ([b462639](https://github.com/FlatHill70/coach-ai/commit/b4626390da76c81407ab7fe2e11e51b794496249))


### Documentation

* fix manual install path (the zip and installers create ~/.claude/skills/coach) ([cd6d16e](https://github.com/FlatHill70/coach-ai/commit/cd6d16ea697c7711ed9262b9321eaacac6ccf249))
* progress for the guided modes ([5217116](https://github.com/FlatHill70/coach-ai/commit/521711674b405f62c44e4589a5741a2826b09326))
* Spanish README media and working badges ([667665f](https://github.com/FlatHill70/coach-ai/commit/667665f242a3e44ed56ab2c3e1698dfa4aa591db))
* update manual install directory to coach-ai in READMEs ([3d45560](https://github.com/FlatHill70/coach-ai/commit/3d45560f4231f27f8c9c2f4afec03265e87edef9))

## 1.2.0 (2026-10-06)

### Features

* `/coach update`: a guided pass that brings workouts, weight, profile and goals up to date, one numbered question at a time, and checks for a new Coach version.
* Check for Coach updates and install them: `update --install` downloads the latest release, verifies its checksum and keeps the previous version; optional automatic updates (`auto_update`).
* Cook with what I have: new recipes for air fryer, griddle or oven from the ingredients at home, with quantities, times, food-safety checks, nutrition per ingredient and a summary against your targets. A recipe history keeps every proposal new.
* What data do you have: `latest` shows the newest workout, weigh-in, body fat, measurements and meal, and what is stale.
* Copy Hevy workouts by hand (pasted text, screenshot or dictated); the next export replaces the copy, so nothing is counted twice.
* `profile review` compares the profile with the last 4 weeks of data; `sync --from` accepts a folder such as Downloads.

## 0.1.0 (2026-10-05)

### Features

* First public release: personal training and nutrition coach skill for Claude Code, installable from the plugin marketplace.
* Onboarding with PAR-Q+ style screening, teen mode (13–17) and special-population guidance.
* Programs for muscle gain, fat loss, recomposition, strength, general health, endurance and sport, from never-trained to elite.
* Data engine: Hevy and Strong CSV, chat logging, Apple Health through an iOS Shortcut, Android Health Connect exports.
* Weekly volume per muscle group, stall detection, weak-point signals (volume, strength trends, ratios), goals with ETAs.
* Nutrition system: calorie and macro targets with safety guards, adaptive TDEE from intake and weight trend, meal plans and shopping lists.
* Custom exercises, bilingual (English/Spanish) catalogue of 144 exercises, update check.
