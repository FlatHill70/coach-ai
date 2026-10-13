# Changelog

## [1.5.0](https://github.com/FlatHill70/coach-ai/compare/v1.4.0...v1.5.0) (2026-10-13)


### Features

* BMI and body type ([c27e30f](https://github.com/FlatHill70/coach-ai/commit/c27e30f1ee66ff2977234bc9655f22ef449f646a))

## [1.4.0](https://github.com/FlatHill70/coach-ai/compare/v1.3.0...v1.4.0) (2026-10-13)


### Features

* recipes that fill what is left of the day's calories and macros ([bde291c](https://github.com/FlatHill70/coach-ai/commit/bde291cafb13b7d35649933c1f7ac16979d170f5))

## [1.3.0](https://github.com/FlatHill70/coach-ai/compare/v1.2.0...v1.3.0) (2026-10-13)


### Features

* breaded and battered options for recipes ([65bcddb](https://github.com/FlatHill70/coach-ai/commit/65bcddb01ecb806071ff5e5a0c69758a3521a170))
* fish, spices and techniques to discover in recipes ([74e0a88](https://github.com/FlatHill70/coach-ai/commit/74e0a8893fffe0634744d748ea6bc6b76e4fb096))
* wheat tortillas and egg dishes in recipes ([37f5793](https://github.com/FlatHill70/coach-ai/commit/37f5793c965912e787b00934a630fac66aadf11c))

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
