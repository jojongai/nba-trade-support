/**
 * Helpers for deterministic draft simulation (backend /draft/simulate).
 */
import type { RankingRow } from "@/lib/api";

/** Minimum one starter at each standard position per team (extend later for G/F/UTIL). */
export const DEFAULT_DRAFT_POSITION_MINS: Record<string, number> = {
  PG: 1,
  SG: 1,
  SF: 1,
  PF: 1,
  C: 1,
};

/** Map NBA-style position strings to fantasy slots a player can fill for the draft. */
export function eligiblePositionsForDraft(apiPosition: string | undefined): string[] {
  const p = (apiPosition || "").trim();
  if (!p || p === "—") return ["PG", "SG", "SF", "PF", "C"];
  if (p === "G") return ["PG", "SG"];
  if (p === "F") return ["SF", "PF"];
  if (p === "C") return ["C"];
  if (p === "G-F" || p === "F-G") return ["PG", "SG", "SF", "PF"];
  if (p === "F-C" || p === "C-F") return ["SF", "PF", "C"];
  if (["PG", "SG", "SF", "PF", "C"].includes(p)) return [p];
  return ["PG", "SG", "SF", "PF", "C"];
}

export type DraftPlayerPayload = {
  /** Stable id (e.g. NBA `player_id`); sent to the draft API for deduplication. */
  player_id: string;
  name: string;
  eligible_positions: string[];
  value: number;
  /** Season totals / volume from rankings — used for category benchmarks. */
  proj_pts?: number;
  proj_reb?: number;
  proj_ast?: number;
  proj_threes?: number;
  proj_stl?: number;
  proj_blk?: number;
  proj_tov?: number;
  proj_fgm?: number;
  proj_fga?: number;
  proj_ftm?: number;
  proj_fta?: number;
};

/** Map rankings row to backend ``proj_*`` fields (season aggregates when present). */
export function projectionsFromRankingRow(row: RankingRow): Partial<DraftPlayerPayload> {
  return {
    proj_pts: row.PTS,
    proj_reb: row.REB,
    proj_ast: row.AST,
    proj_threes: row.FG3M,
    proj_stl: row.STL,
    proj_blk: row.BLK,
    proj_tov: row.TOV,
    proj_fgm: row.FGM,
    proj_fga: row.FGA,
    proj_ftm: row.FTM,
    proj_fta: row.FTA,
  };
}

/**
 * Build a draft pool from rankings, sorted by trade value (desc).
 * By default includes all ranked rows; cap with `maxPlayers` if needed.
 */
export function buildDraftPlayerPoolFromRankings(
  rankings: RankingRow[],
  tradeValueMap: Map<number, number>,
  options?: { maxPlayers?: number }
): DraftPlayerPayload[] {
  const maxPlayers = options?.maxPlayers ?? rankings.length;
  const scored = rankings.map((row) => ({
    row,
    val: tradeValueMap.get(row.player_id) ?? 0,
  }));
  scored.sort((a, b) => b.val - a.val || a.row.full_name.localeCompare(b.row.full_name));
  const out: DraftPlayerPayload[] = [];
  for (let i = 0; i < scored.length && out.length < maxPlayers; i++) {
    const { row, val } = scored[i];
    out.push({
      player_id: String(row.player_id),
      name: row.full_name,
      eligible_positions: eligiblePositionsForDraft(row.position),
      value: val,
      ...projectionsFromRankingRow(row),
    });
  }
  return out;
}
