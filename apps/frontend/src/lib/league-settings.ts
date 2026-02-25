/**
 * Shared league settings storage for NBA Trade Support.
 * Used by League Settings page (save/load), Player Rankings (points weights), and Trade Analyzer (future).
 */

export const LEAGUE_SETTINGS_STORAGE_KEY = "nba-trade-support/league-settings";

export interface PointsSettings {
  [key: string]: number;
}

export interface CategorySettings {
  name: string;
  enabled: boolean;
  inverted?: boolean;
}

export interface RosterSettings {
  pg: number;
  sg: number;
  sf: number;
  pf: number;
  c: number;
  g: number;
  f: number;
  util: number;
  bench: number;
}

/** Default roster slot counts when none are saved (e.g. 1 PG, 1 SG, ..., 2 UTIL, 3 bench). */
export const DEFAULT_ROSTER_SETTINGS: RosterSettings = {
  pg: 1,
  sg: 1,
  sf: 1,
  pf: 1,
  c: 1,
  g: 1,
  f: 1,
  util: 2,
  bench: 3,
};

export interface LeagueSettings {
  leagueName: string;
  leagueFormat: "points" | "category";
  pointsSettings?: PointsSettings;
  categories?: CategorySettings[];
  categoryFormat?: "h2h" | "roto";
  selectedPreset?: "custom" | "espn" | "yahoo" | "sleeper";
  rosterSettings?: RosterSettings;
}

export function getLeagueSettings(): LeagueSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEAGUE_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as LeagueSettings;
  } catch {
    return null;
  }
}

export function setLeagueSettings(settings: LeagueSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LEAGUE_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch {
    // ignore
  }
}

/** Returns saved points weights if format is points and weights exist; otherwise null. */
export function getSavedPointsWeights(): PointsSettings | null {
  const saved = getLeagueSettings();
  if (!saved || saved.leagueFormat !== "points" || !saved.pointsSettings)
    return null;
  return saved.pointsSettings;
}
