/**
 * Builds a simple JSON payload for LLM consumption.
 * Skeleton: league_context, team_a, team_b, players, trade_summary
 */
import type { RankingRow } from "@/lib/api";
import type { FantasyPlayer } from "@/types/players";
import type { LeagueSettings } from "@/lib/league-settings";
import { computeTradeValues } from "./trade-value";

export interface TradeContextForLLM {
  league_context: Record<string, unknown>;
  team_a: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    players_sent: string[];
    players_received: string[];
    impact_summary: Record<string, unknown>;
  };
  team_b: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    players_sent: string[];
    players_received: string[];
    impact_summary: Record<string, unknown>;
  };
  players: Record<
    string,
    {
      bio: Record<string, unknown>;
      season_stats: Record<string, unknown>;
      recent_stats: Record<string, unknown>;
      advanced_metrics: Record<string, unknown>;
      projection: Record<string, unknown>;
      risk: Record<string, unknown>;
      trade_value: Record<string, unknown>;
    }
  >;
  trade_summary: {
    fairness_score: number;
    short_term_edge: string;
    long_term_edge: string;
    flags: string[];
  };
}

export interface RosterSlotInput {
  position: string;
  player: FantasyPlayer | null;
}

export interface BuildTradeContextOptions {
  useSavedWeights?: boolean;
  rosterSlots?: RosterSlotInput[];
  leagueSettings?: LeagueSettings | null;
}

function getRankingRow(rankings: RankingRow[], playerId: string): RankingRow | undefined {
  const pid = parseInt(playerId, 10);
  return rankings.find((r) => r.player_id === pid);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/**
 * Builds a simple JSON payload for feeding into an LLM.
 */
export function buildTradeContextForLLM(
  tradingAway: FantasyPlayer[],
  receiving: FantasyPlayer[],
  rankings: RankingRow[],
  options?: BuildTradeContextOptions
): TradeContextForLLM {
  const opts = options ?? {};
  const tradeValueMap = computeTradeValues(rankings, opts);
  const leagueSettings = opts.leagueSettings ?? null;
  const rosterSlots = opts.rosterSlots ?? [];

  const tradingAwayIds = new Set(tradingAway.map((p) => p.id));

  const allPlayerIds = new Set([
    ...rosterSlots.filter((s) => s.player).map((s) => s.player!.id),
    ...tradingAway.map((p) => p.id),
    ...receiving.map((p) => p.id),
  ]);
  const rosterBefore = rosterSlots.filter((s) => s.player != null).map((s) => s.player!.id);
  const rosterAfter: string[] = [];
  let recvIdx = 0;
  for (const slot of rosterSlots) {
    if (!slot.player) continue;
    if (tradingAwayIds.has(slot.player.id)) {
      if (recvIdx < receiving.length) {
        rosterAfter.push(receiving[recvIdx].id);
        recvIdx++;
      }
    } else {
      rosterAfter.push(slot.player.id);
    }
  }
  while (recvIdx < receiving.length) {
    rosterAfter.push(receiving[recvIdx].id);
    recvIdx++;
  }

  const allPlayers = new Map<string, FantasyPlayer>();
  for (const p of [...tradingAway, ...receiving]) allPlayers.set(p.id, p);
  for (const slot of rosterSlots) {
    if (slot.player && !allPlayers.has(slot.player.id)) {
      allPlayers.set(slot.player.id, slot.player);
    }
  }

  const players: TradeContextForLLM["players"] = {};
  for (const id of allPlayerIds) {
    const fp = allPlayers.get(id);
    const ranking = getRankingRow(rankings, id) ?? rankings.find((r) => String(r.player_id) === id);
    const tradeVal = tradeValueMap.get(parseInt(id, 10)) ?? 0;
    const gp = ranking?.GP ?? 1;

    players[id] = {
      bio: {
        name: fp?.name ?? ranking?.full_name,
        team: fp?.team ?? ranking?.team_abbreviation,
        position: fp?.position ?? ranking?.position,
        rank: fp?.fantasRank ?? ranking?.rank,
        injury_status: fp?.injuryStatus,
      },
      season_stats: {
        ppg: gp > 0 && ranking?.PTS != null ? round1(ranking.PTS / gp) : undefined,
        rpg: gp > 0 && ranking?.REB != null ? round1(ranking.REB / gp) : undefined,
        apg: gp > 0 && ranking?.AST != null ? round1(ranking.AST / gp) : undefined,
        spg: gp > 0 && ranking?.STL != null ? round1(ranking.STL / gp) : undefined,
        bpg: gp > 0 && ranking?.BLK != null ? round1(ranking.BLK / gp) : undefined,
        fg3m: gp > 0 && ranking?.FG3M != null ? round1(ranking.FG3M / gp) : undefined,
        tov: gp > 0 && ranking?.TOV != null ? round1(ranking.TOV / gp) : undefined,
        fg_pct: ranking?.FG_PCT,
        ft_pct: ranking?.FT_PCT,
        gp: ranking?.GP,
        mpg: ranking?.MPG != null ? round1(ranking.MPG) : undefined,
      },
      recent_stats: {},
      advanced_metrics: {},
      projection: {},
      risk: { volatility: fp?.volatility },
      trade_value: { score: round2(tradeVal) },
    };
  }

  const sumValue = (ids: string[]) =>
    ids.reduce((s, id) => s + (tradeValueMap.get(parseInt(id, 10)) ?? 0), 0);
  const sumPpg = (ids: string[]) =>
    ids.reduce((s, id) => {
      const r = getRankingRow(rankings, id);
      const gp = r?.GP ?? 1;
      return s + (r?.PTS != null && gp > 0 ? r.PTS / gp : 0);
    }, 0);

  const beforeValue = sumValue(rosterBefore);
  const afterValue = sumValue(rosterAfter);
  const beforePpg = sumPpg(rosterBefore);
  const afterPpg = sumPpg(rosterAfter);
  const valueDelta = afterValue - beforeValue;
  const ppgDelta = afterPpg - beforePpg;

  const tradeValueDelta = receiving.reduce((s, p) => s + (tradeValueMap.get(parseInt(p.id, 10)) ?? 0), 0) -
    tradingAway.reduce((s, p) => s + (tradeValueMap.get(parseInt(p.id, 10)) ?? 0), 0);
  const fairnessScore = Math.max(0, Math.min(100, 100 - Math.abs(tradeValueDelta) * 2));

  const flags: string[] = [];
  if (fairnessScore < 60) flags.push("Low fairness score");
  if (ppgDelta < -5) flags.push("Significant scoring drop");
  if (ppgDelta > 5) flags.push("Scoring upgrade");

  const shortTermEdge = ppgDelta > 0 ? "Scoring improves short-term" : ppgDelta < 0 ? "Scoring weakens short-term" : "";
  const longTermEdge = valueDelta > 0 ? "Value gain long-term" : valueDelta < 0 ? "Value loss long-term" : "";

  const leagueContext: Record<string, unknown> = {};
  if (leagueSettings) {
    leagueContext.league_name = leagueSettings.leagueName;
    leagueContext.league_format = leagueSettings.leagueFormat;
    leagueContext.roster_requirements = leagueSettings.rosterSettings;
    if (leagueSettings.leagueFormat === "points" && leagueSettings.pointsSettings) {
      leagueContext.points_settings = leagueSettings.pointsSettings;
    }
    if (leagueSettings.leagueFormat === "category" && leagueSettings.categories) {
      leagueContext.categories = leagueSettings.categories;
      leagueContext.category_format = leagueSettings.categoryFormat;
    }
  }

  return {
    league_context: leagueContext,
    team_a: {
      before: { roster_ids: rosterBefore, value: round2(beforeValue), ppg: round1(beforePpg) },
      after: {
        roster_ids: rosterAfter,
        value: round2(afterValue),
        ppg: round1(afterPpg),
      },
      players_sent: tradingAway.map((p) => p.id),
      players_received: receiving.map((p) => p.id),
      impact_summary: {
        value_delta: round2(valueDelta),
        ppg_delta: round1(ppgDelta),
        fairness_score: fairnessScore,
      },
    },
    team_b: {
      before: {},
      after: {},
      players_sent: receiving.map((p) => p.id),
      players_received: tradingAway.map((p) => p.id),
      impact_summary: {},
    },
    players,
    trade_summary: {
      fairness_score: fairnessScore,
      short_term_edge: shortTermEdge,
      long_term_edge: longTermEdge,
      flags,
    },
  };
}
