/**
 * Value score for the Player Rankings “Value” column and trade features.
 * Single implementation: z-score weighted aggregation (Categories vs League points weights).
 */
import type { RankingRow } from "@/lib/api";
import { getSavedPointsWeights } from "@/lib/league-settings";

const VALUE_STAT_KEYS_GENERAL = ["PTS", "REB", "AST", "STL", "BLK", "FG3M", "FG_PCT", "FT_PCT", "TOV"] as const;
const VALUE_STAT_KEYS_POINTS = ["PTS", "REB", "AST", "STL", "BLK", "FG3M", "TOV", "FGM", "FGA", "FTM", "FTA"] as const;
type ValueStatKeyGeneral = (typeof VALUE_STAT_KEYS_GENERAL)[number];
type ValueStatKeyPoints = (typeof VALUE_STAT_KEYS_POINTS)[number];
type ValueStatKey = ValueStatKeyGeneral | ValueStatKeyPoints;

const VALUE_LOWER_IS_BETTER_GENERAL = new Set<ValueStatKey>(["TOV"]);
const VALUE_LOWER_IS_BETTER_POINTS = new Set<ValueStatKey>(["TOV", "FGA", "FTA"]);

const SAVED_WEIGHT_MAP: Partial<Record<ValueStatKeyPoints, string>> = {
  PTS: "points",
  REB: "rebounds",
  AST: "assists",
  STL: "steals",
  BLK: "blocks",
  TOV: "turnovers",
  FG3M: "threePointersMade",
  FGM: "fieldGoalsMade",
  FGA: "fieldGoalsAttempted",
  FTM: "freeThrowsMade",
  FTA: "freeThrowsAttempted",
};

/** Matches Player Rankings “Categories” vs “League value weights” toggles. */
export type RankingValueFormat = "general" | "saved";

/**
 * Prior “games” for GP shrinkage: low-GP players are pulled toward league average per stat.
 * Formula per stat: (GP/(GP+k))*raw + (k/(GP+k))*leagueAvg (same idea as PPG, applied to all value columns).
 */
export const DEFAULT_GP_SHRINKAGE_K = 15;

export interface TradeValueOptions {
  /** Use saved points league weights when available; otherwise categories (general) weights. */
  useSavedWeights?: boolean;
  /** Set to 0 to disable GP adjustment. Default {@link DEFAULT_GP_SHRINKAGE_K}. */
  gpShrinkageK?: number;
}

export interface RankingValueComputeOptions {
  /** Set to 0 to disable GP adjustment. Default {@link DEFAULT_GP_SHRINKAGE_K}. */
  gpShrinkageK?: number;
}

function getValueWeightsForFormat(format: RankingValueFormat): Record<ValueStatKey, number> {
  if (format === "saved") {
    const saved = getSavedPointsWeights();
    if (saved) {
      const w: Record<ValueStatKey, number> = {
        PTS: 1, REB: 1, AST: 1, STL: 1, BLK: 1, FG3M: 1, TOV: 1,
        FGM: 1, FGA: 1, FTM: 1, FTA: 1,
        FG_PCT: 1, FT_PCT: 1,
      };
      for (const [statKey, settingKey] of Object.entries(SAVED_WEIGHT_MAP)) {
        const v = saved[settingKey];
        if (typeof v === "number") {
          w[statKey as ValueStatKeyPoints] = (statKey === "TOV" || statKey === "FGA" || statKey === "FTA")
            ? Math.abs(v)
            : v;
        }
      }
      return w;
    }
  }
  return {
    PTS: 1, REB: 1, AST: 1, STL: 1, BLK: 1, FG3M: 1, FG_PCT: 1, FT_PCT: 1, TOV: 1,
    FGM: 1, FGA: 1, FTM: 1, FTA: 1,
  };
}

function getValueStatNumber(row: RankingRow, key: ValueStatKey): number {
  if (key === "FG_PCT" || key === "FT_PCT") return Number(row[key]) ?? 0;
  const v = row[key as keyof RankingRow] ?? 0;
  const gp = row.GP || 1;
  return Number(v) / gp;
}

/** Actual games played for shrinkage (0 if missing / none). */
function getGamesPlayed(row: RankingRow): number {
  const g = row.GP;
  if (g == null || Number.isNaN(Number(g))) return 0;
  return Math.max(0, Number(g));
}

/**
 * Blends player rate toward league average; more weight on league avg when GP is low.
 */
function gpAdjustedStat(raw: number, gp: number, leagueAverage: number, k: number): number {
  if (k <= 0) return raw;
  const denom = gp + k;
  if (denom <= 0) return leagueAverage;
  return (gp / denom) * raw + (k / denom) * leagueAverage;
}

/**
 * Same value score as the Player Rankings table “Value” column for the given format.
 * Optionally shrinks each stat toward league average using GP (see {@link DEFAULT_GP_SHRINKAGE_K}).
 */
export function computeRankingValueScores(
  rankings: RankingRow[],
  format: RankingValueFormat,
  computeOpts?: RankingValueComputeOptions
): Map<number, number> {
  const k = computeOpts?.gpShrinkageK ?? DEFAULT_GP_SHRINKAGE_K;
  const valueStatKeys = format === "saved" ? VALUE_STAT_KEYS_POINTS : VALUE_STAT_KEYS_GENERAL;
  const valueLowerIsBetter = format === "saved" ? VALUE_LOWER_IS_BETTER_POINTS : VALUE_LOWER_IS_BETTER_GENERAL;
  const valueWeights = getValueWeightsForFormat(format);

  const leagueMeans: Record<string, number> = {};
  for (const stat of valueStatKeys) {
    const values = rankings
      .map((r) => getValueStatNumber(r, stat))
      .filter((v) => v != null && !Number.isNaN(v));
    const n = values.length;
    leagueMeans[stat] = n ? values.reduce((a, b) => a + b, 0) / n : 0;
  }

  const adjustedByPlayer = new Map<number, Record<string, number>>();
  for (const row of rankings) {
    const gp = getGamesPlayed(row);
    const adj: Record<string, number> = {};
    for (const stat of valueStatKeys) {
      const raw = getValueStatNumber(row, stat);
      const leagueAvg = leagueMeans[stat] ?? 0;
      adj[stat] = k <= 0 ? raw : gpAdjustedStat(raw, gp, leagueAvg, k);
    }
    adjustedByPlayer.set(row.player_id, adj);
  }

  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};

  for (const stat of valueStatKeys) {
    const values = rankings
      .map((r) => adjustedByPlayer.get(r.player_id)?.[stat])
      .filter((v): v is number => v != null && !Number.isNaN(v));
    const n = values.length;
    const mean = n ? values.reduce((a, b) => a + b, 0) / n : 0;
    means[stat] = mean;
    const variance = n ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n : 0;
    stds[stat] = Math.sqrt(variance) || 1e-6;
  }

  const zScoresByPlayerId = new Map<number, Record<string, number>>();
  for (const row of rankings) {
    const zScores: Record<string, number> = {};
    const adj = adjustedByPlayer.get(row.player_id);
    for (const stat of valueStatKeys) {
      const v = adj?.[stat] ?? getValueStatNumber(row, stat);
      const mean = means[stat];
      const std = stds[stat];
      const lowerIsBetter = valueLowerIsBetter.has(stat);
      const z = lowerIsBetter ? (mean - v) / std : (v - mean) / std;
      zScores[stat] = z;
    }
    zScoresByPlayerId.set(row.player_id, zScores);
  }

  const out = new Map<number, number>();
  const totalWeight = valueStatKeys.reduce((s, k) => s + (valueWeights[k] ?? 0), 0);
  if (!totalWeight) return out;

  for (const [playerId, zScores] of zScoresByPlayerId) {
    let sum = 0;
    for (const stat of valueStatKeys) {
      sum += (zScores[stat] ?? 0) * (valueWeights[stat] ?? 0);
    }
    out.set(playerId, sum / totalWeight);
  }
  return out;
}

/**
 * Trade analyzer uses league weights when saved; otherwise “Categories” value (same as rankings default).
 */
export function computeTradeValues(
  rankings: RankingRow[],
  options: TradeValueOptions = {}
): Map<number, number> {
  const { useSavedWeights = false, gpShrinkageK } = options;
  const format: RankingValueFormat =
    useSavedWeights && getSavedPointsWeights() ? "saved" : "general";
  const k = gpShrinkageK ?? DEFAULT_GP_SHRINKAGE_K;
  return computeRankingValueScores(rankings, format, { gpShrinkageK: k });
}
