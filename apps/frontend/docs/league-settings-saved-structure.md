# League settings – saved data structure

Stored in `localStorage` under key **`nba-trade-support/league-settings`** as JSON.

---

## Points league (when user saves with "Points" selected)

```json
{
  "leagueName": "My Fantasy League",
  "leagueFormat": "points",
  "selectedPreset": "custom",
  "pointsSettings": {
    "points": 1,
    "assists": 1.5,
    "rebounds": 1.2,
    "offensiveRebounds": 1,
    "defensiveRebounds": 1,
    "steals": 3,
    "blocks": 3,
    "turnovers": -1,
    "fieldGoalsMade": 0.5,
    "fieldGoalsAttempted": -0.5,
    "freeThrowsMade": 1,
    "freeThrowsAttempted": -0.5,
    "threePointersMade": 3,
    "doubleDoubles": 5,
    "tripleDoubles": 10,
    "technicalFouls": -2,
    "flagrantFouls": -5,
    "minutesPlayed": 0
  }
}
```

- **`leagueName`** (string) – display name.
- **`leagueFormat`** – always `"points"` for this case.
- **`selectedPreset`** – `"custom"` | `"espn"` | `"yahoo"` | `"sleeper"`.
- **`pointsSettings`** – one number per stat key (fantasy point value per stat). Negative = penalty. Keys: `points`, `assists`, `rebounds`, `offensiveRebounds`, `defensiveRebounds`, `steals`, `blocks`, `turnovers`, `fieldGoalsMade`, `fieldGoalsAttempted`, `freeThrowsMade`, `freeThrowsAttempted`, `threePointersMade`, `doubleDoubles`, `tripleDoubles`, `technicalFouls`, `flagrantFouls`, `minutesPlayed`.

---

## Category league (when user saves with "Category" selected)

```json
{
  "leagueName": "My Fantasy League",
  "leagueFormat": "category",
  "selectedPreset": "custom",
  "categories": [
    { "name": "Points (PTS)", "enabled": true },
    { "name": "Assists (AST)", "enabled": true },
    { "name": "Rebounds (REB)", "enabled": true },
    { "name": "Steals (STL)", "enabled": true },
    { "name": "Blocks (BLK)", "enabled": true },
    { "name": "Turnovers (TO)", "enabled": true, "inverted": true },
    { "name": "Field Goal % (FG%)", "enabled": true },
    { "name": "Free Throw % (FT%)", "enabled": true },
    { "name": "3-Pointers Made (3PM)", "enabled": true },
    { "name": "Double-Doubles", "enabled": false },
    { "name": "Triple-Doubles", "enabled": false }
  ],
  "categoryFormat": "h2h"
}
```

- **`leagueName`** (string) – display name.
- **`leagueFormat`** – always `"category"` for this case.
- **`selectedPreset`** – only relevant for points; still saved for consistency.
- **`categories`** – array of `{ name: string, enabled: boolean, inverted?: boolean }`. `inverted: true` = lower is better (e.g. Turnovers).
- **`categoryFormat`** – `"h2h"` (head-to-head) | `"roto"` (rotisserie).

---

## TypeScript (from `@/lib/league-settings`)

```ts
interface LeagueSettings {
  leagueName: string;
  leagueFormat: "points" | "category";
  pointsSettings?: { [key: string]: number };   // only for points
  categories?: { name: string; enabled: boolean; inverted?: boolean }[];  // only for category
  categoryFormat?: "h2h" | "roto";             // only for category
  selectedPreset?: "custom" | "espn" | "yahoo" | "sleeper";
}
```

- **Points league:** `leagueFormat === "points"` and `pointsSettings` is present; `categories` / `categoryFormat` are not set (or ignored).
- **Category league:** `leagueFormat === "category"` and `categories` (+ optional `categoryFormat`) are present; `pointsSettings` is not set (or ignored).
