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

export interface LeagueSettings {
  leagueName: string;
  leagueFormat: "points" | "category";
  pointsSettings?: PointsSettings;
  categories?: CategorySettings[];
  categoryFormat?: "h2h" | "roto";
  selectedPreset?: "custom" | "espn" | "yahoo" | "sleeper";
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
