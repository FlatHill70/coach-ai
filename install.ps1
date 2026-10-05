# Installs or updates the Coach skill into ~/.claude/skills/coach from the latest GitHub release.
# Your data in ~/.coach is never touched.
$ErrorActionPreference = 'Stop'

$Repo = 'FlatHill70/coach'
$Version = if ($env:COACH_VERSION) { $env:COACH_VERSION } else { 'latest' }
$SkillsDir = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $HOME '.claude\skills' }
$Dest = Join-Path $SkillsDir 'coach'

$Url = if ($Version -eq 'latest') {
  "https://github.com/$Repo/releases/latest/download/coach-skill.zip"
} else {
  "https://github.com/$Repo/releases/download/$Version/coach-skill.zip"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Coach needs Node.js 20 or newer: https://nodejs.org'
}

$Tmp = Join-Path ([IO.Path]::GetTempPath()) ("coach-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $Tmp | Out-Null
try {
  Write-Host "Downloading $Url"
  $Zip = Join-Path $Tmp 'coach-skill.zip'
  Invoke-WebRequest -Uri $Url -OutFile $Zip -UseBasicParsing
  Expand-Archive -Path $Zip -DestinationPath $Tmp -Force
  if (-not (Test-Path (Join-Path $Tmp 'coach\SKILL.md'))) { throw 'The download does not look like the Coach skill.' }

  New-Item -ItemType Directory -Force -Path $SkillsDir | Out-Null
  if (Test-Path $Dest) {
    $Previous = "$Dest.previous"
    if (Test-Path $Previous) { Remove-Item -Recurse -Force $Previous }
    Move-Item $Dest $Previous
  }
  Move-Item (Join-Path $Tmp 'coach') $Dest

  $Installed = (Select-String -Path (Join-Path $Dest 'SKILL.md') -Pattern '^\s+version:\s*([\d.]+)' | Select-Object -First 1).Matches.Groups[1].Value
  Write-Host "Coach $Installed installed in $Dest"
  if (Test-Path "$Dest.previous") { Write-Host "The previous version is kept in $Dest.previous" }
  Write-Host 'Start a new Claude Code session and type: /coach'
} finally {
  Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue
}
