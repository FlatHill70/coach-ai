# Changelog

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
