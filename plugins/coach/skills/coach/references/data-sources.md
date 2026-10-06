# Data sources

Everything is optional. With no apps at all, the user logs workouts, weight and meals by chat (`workouts log`, `body log`, `nutrition log`). Configure only what the user actually uses.

| Data | Source | How it arrives | Freshness |
|---|---|---|---|
| Workouts | **Hevy** (free) | CSV export → inbox → `sync` | Manual, weekly |
| Workouts | **Strong** (free or Pro) | CSV export → inbox → `sync` | Manual, weekly |
| Workouts | **Hevy PRO API** | `hevy-mcp` MCP server: read workouts, create routines | Live |
| Workouts | Chat | `workouts log` | Live |
| Weight, body fat, lean mass, kcal, macros, steps | **Apple Health** (any scale or food app that writes to Health) | iOS Shortcut → text file in iCloud Drive (inbox) | Automatic, on app close |
| Same | **Android Health Connect** | Scheduled export (zip) → Google Drive or local folder (inbox) → `sync` | Automatic, daily/weekly |
| Weight, measurements | Chat | `body log` | Live |
| Food | Chat (description or photo) | `nutrition log` | Live |

## The inbox

The inbox is one folder that the computer running Claude Code can read, and where the phone drops files.
- iPhone: `iCloud Drive/Coach`. On Windows with iCloud for Windows: `~/iCloudDrive/Coach`. On macOS: `~/Library/Mobile Documents/com~apple~CloudDocs/Coach`.
- Android: a Google Drive folder synced to the computer (Google Drive for desktop), e.g. `G:/My Drive/Coach`, or any synced folder (Dropbox, OneDrive, Syncthing).

Save it with `profile set inbox="<path>"` (a list is fine: `inbox=["path1","path2"]`). `COACH_INBOX` overrides it.

**Windows + iCloud gotcha**: iCloud for Windows leaves new files "online-only", so reading them fails with *permission denied*. Mark the folder as always kept: `attrib +P "<inbox>"` in PowerShell, or right-click › *Always keep on this device*.

## Hevy (CSV)
Phone: Hevy → Profile → ⚙️ Settings → **Export & Import Data** → **Export Workouts** → Save to Files / Drive → inbox. Then run `sync`. Each export is the full history, and `sync` keeps only the newest. Hevy logs the weight of dumbbell and unilateral exercises **per side**. Remember that when comparing with barbell numbers.

No time to export? Workouts can be passed by hand (pasted share text, a screenshot or dictated): they are saved with `--source hevy` and the next export replaces them, so nothing is counted twice.

## Strong (CSV)
Phone: Strong → Profile → ⚙️ Settings → **Export Data** (Export strong.csv) → save to the inbox → `sync`. Strong's CSV has no unit column: set `profile set strong_unit=lb` if the app is in pounds. Warm-up, drop and failure sets (W/D/F) are recognised.

## Hevy PRO API (optional)
With Hevy PRO, create an API key at hevy.com › Settings › Developer and install an MCP server, e.g.:

```
claude mcp add hevy -s user -e HEVY_API_KEY=<key> -- npx -y hevy-mcp
```

(on Windows: `-- cmd /c npx -y hevy-mcp`). Then you can read workouts live and **create routines directly in Hevy** from a program. The CSV route still works without PRO.

## Apple Health via iOS Shortcut
Apple has no cloud API for Health, so a Shortcut on the iPhone writes a small text file to iCloud Drive whenever a chosen app closes. Setup: `references/apple-shortcut.md`. File name: `coach_health.txt`. Line format: `kind;ISO date;value;unit` with kinds `weight`, `bodyfat`, `lean`, `kcal`, `protein`, `carbs`, `fat_g`, `steps`. The engine reads it live from the inbox, so no `sync` is needed (but `sync` also keeps a copy).

## Android Health Connect
Health Connect (Android 14+, or the Health Connect app on older versions) can **export all data on a schedule**: Settings → Security & privacy → Privacy controls → **Health Connect** → *Manage data* → **Export / Backup and restore** → *Scheduled export* → daily or weekly → choose the Coach folder in Google Drive. The menu path varies by manufacturer, so search Settings for "Health Connect". `sync` extracts the zip and reads weight, body fat, lean mass, steps and nutrition. It needs Node.js 22.13+ (`node:sqlite`). Scales and food apps that write to Health Connect: Withings, Renpho, Xiaomi/Zepp, Samsung Health, MyFitnessPal, Cronometer, MacroFactor and others.

## Troubleshooting
- `body info` shows what was found, how old it is and any unreadable lines.
- Weigh-ins stop arriving (iOS): open Shortcuts › Automation and check it's still set to *Run immediately*. Run the shortcut once by hand to re-grant Health permissions.
- Health Connect: check the export ran (date of the zip in Drive) and that Drive for desktop finished syncing. `body info` › `healthConnect.schema` shows the tables and columns found. If a column changed name, report it upstream.
- A CSV is rejected: the error prints the header received. Don't guess. Show it and check the format here.
