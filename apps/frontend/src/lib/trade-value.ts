/**
 * Shared trade value computation for Player Rankings and Trade Analyzer.
 * Uses z-score weighted aggregation across fantasy-relevant stats.
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

export interface TradeValueOptions {
  /** Use saved points league weights when available; otherwise categories (general) weights. */
  useSavedWeights?: boolean;
}

function getValueWeights(useSavedWeights: boolean): Record<ValueStatKey, number> {
  if (useSavedWeights) {
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

/**
 * Compute trade value (z-score weighted) for each player in rankings.
 * Returns a map of player_id -> value score.
 */
export function computeTradeValues(
  rankings: RankingRow[],
  options: TradeValueOptions = {}
): Map<number, number> {
  const { useSavedWeights = false } = options;
  const valueStatKeys = useSavedWeights && getSavedPointsWeights()
    ? VALUE_STAT_KEYS_POINTS
    : VALUE_STAT_KEYS_GENERAL;
  const valueLowerIsBetter = useSavedWeights && getSavedPointsWeights()
    ? VALUE_LOWER_IS_BETTER_POINTS
    : VALUE_LOWER_IS_BETTER_GENERAL;
  const valueWeights = getValueWeights(useSavedWeights);

  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};

  for (const stat of valueStatKeys) {
    const values = rankings
      .map((r) => getValueStatNumber(r, stat))
      .filter((v) => v != null && !Number.isNaN(v));
    const n = values.length;
    const mean = n ? values.reduce((a, b) => a + b, 0) / n : 0;
    means[stat] = mean;
    const variance = n ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n : 0;
    stds[stat] = Math.sqrt(variance) || 1e-6;
  }

  const zScoresByPlayerId = new Map<number, Record<string, number>>();
  for (const row of rankings) {
    const zScores: Record<string, number> = {};
    for (const stat of valueStatKeys) {
      const v = getValueStatNumber(row, stat);
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
