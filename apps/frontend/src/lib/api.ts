import type { FantasyPlayer } from "@/types/players";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Player = {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  is_active?: boolean;
};

/** Map backend player to UI fantasy player (no fantasy stats until backend supports them). */
export function apiPlayerToFantasyPlayer(p: Player): FantasyPlayer {
  return {
    id: String(p.id),
    name: p.full_name,
    // team, position, fantasRank, ppg, rpg, apg, imageUrl, injuryStatus, tradeValue, volatility left undefined
  };
}

export async function searchPlayers(
  fullName?: string,
  firstName?: string,
  lastName?: string,
  activeOnly = true
): Promise<Player[]> {
  const params = new URLSearchParams();
  if (fullName) params.set("full_name", fullName);
  if (firstName) params.set("first_name", firstName);
  if (lastName) params.set("last_name", lastName);
  if (!activeOnly) params.set("active_only", "false");
  const res = await fetch(`${API_BASE}/players/search?${params}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export type RankingRow = {
  player_id: number;
  full_name: string;
  team_abbreviation?: string;
  position?: string;
  rank: number;
  GP?: number;
  MPG?: number;
  FG_PCT?: number;
  FT_PCT?: number;
  FGM?: number;
  FGA?: number;
  FTM?: number;
  FTA?: number;
  FG3M?: number;
  PTS?: number;
  REB?: number;
  AST?: number;
  STL?: number;
  BLK?: number;
  TOV?: number;
  /** Same as Player Rankings “Value” column when set; computed client-side via `computeRankingValueScores`. */
  value?: number;
};

export async function fetchRankings(): Promise<RankingRow[]> {
  const res = await fetch(`${API_BASE}/players/rankings`);
  if (!res.ok) throw new Error("Failed to fetch rankings");
  return res.json();
}

export type Team = {
  id: number;
  full_name: string;
  abbreviation: string;
  nickname?: string;
  city?: string;
  state?: string;
  year_founded?: number;
};

export async function fetchTeams(): Promise<Team[]> {
  const res = await fetch(`${API_BASE}/teams`);
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

/** POST trade context to OpenAI-backed analysis; response body matches LLMTradeResponse when successful. */
export async function fetchTradeAnalysis(
  tradeContext: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/llm/openai/trade-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trade_context: tradeContext }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data &&
      typeof data === "object" &&
      "detail" in data &&
      typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Analysis failed (${res.status})`;
    throw new Error(detail);
  }
  return data;
}

export type DraftSimulateTeam = {
  id: number;
  roster: {
    player_id: string;
    name: string;
    eligible_positions: string[];
    value: number;
  }[];
  position_counts: Record<string, number>;
};

/** Per-category league distribution (team totals / weighted %); from benchmark engine. */
export type CategoryStatBenchmark = {
  average: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
  /** One value per simulated team (ascending); used for percentile comparisons. */
  sorted_values: number[];
};

export type LeagueBenchmarksApi = {
  overall: {
    team_scores: { team_id: number; score: number }[];
    sorted_scores: number[];
    average_score: number;
    median_score: number;
    min_score: number;
    max_score: number;
    top_quartile_score: number;
    bottom_quartile_score: number;
  };
  categories: Record<string, CategoryStatBenchmark>;
};

export async function fetchDraftSimulate(body: {
  num_teams: number;
  roster_size?: number;
  requirements: Record<string, number>;
  players: {
    player_id: string;
    name: string;
    eligible_positions: string[];
    value: number;
  }[];
}): Promise<{ teams: DraftSimulateTeam[]; benchmarks: LeagueBenchmarksApi }> {
  const res = await fetch(`${API_BASE}/draft/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roster_size: 12,
      ...body,
    }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data &&
      typeof data === "object" &&
      "detail" in data &&
      typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Draft simulation failed (${res.status})`;
    throw new Error(detail);
  }
  return data as { teams: DraftSimulateTeam[]; benchmarks: LeagueBenchmarksApi };
}

/** Season-style totals / volume for ``/team/analyze`` roster_players (matches draft ``proj_*``). */
export type TeamAnalyzeRosterPlayer = {
  player_id: string;
  name: string;
  eligible_positions: string[];
  value: number;
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

export type TradeTargetsCandidate = {
  player_id: string;
  name: string;
  team: string;
  position: string;
  trade_value: number;
  fit_score: number;
  per_game: Record<string, number>;
};

export type TradeTargetsBundle = {
  needs: string[];
  avoid_hurting: string[];
  trade_assets: string[];
  candidates: TradeTargetsCandidate[];
  curated_for_llm: TradeTargetsCandidate[];
  summary_for_prompt: {
    user_team_weaknesses: string[];
    user_team_strengths: string[];
    tradeable_players: string[];
    candidate_trade_targets: string[];
    note?: string;
  };
};

export type TeamAnalysisResponse = {
  profile: Record<string, unknown>;
  league_comparison: {
    overall: {
      team_score: number;
      percentile_estimate: number;
      delta_vs_average: number;
      delta_vs_median: number;
      rank_bucket: string;
    };
    categories: Record<
      string,
      {
        value: number;
        delta_vs_median: number;
        delta_vs_average: number;
        percentile_estimate: number;
        rank_bucket: string;
        lower_is_better: boolean;
      }
    >;
    strongest_categories: string[];
    weakest_categories: string[];
  };
  flags: string[];
  candidate_actions: string[];
  trade_targets: TradeTargetsBundle | null;
};

export async function fetchTeamAnalyze(body: {
  benchmarks: LeagueBenchmarksApi;
  roster_players: TeamAnalyzeRosterPlayer[];
  roster_slots: { slot_label: string; player_id: string | null }[];
  draft_pool_values: number[];
  total_league_slots: number;
  /** When set, backend returns deterministic trade_targets (needs, candidates, …). */
  player_values?: Record<string, number>;
}): Promise<TeamAnalysisResponse> {
  const res = await fetch(`${API_BASE}/team/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data &&
      typeof data === "object" &&
      "detail" in data &&
      typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Team analysis failed (${res.status})`;
    throw new Error(detail);
  }
  return data as TeamAnalysisResponse;
}

/** LLM layer on top of deterministic ``fetchTeamAnalyze`` output. */
export type TeamIdentityLLMResponse = {
  team_identity: string;
  narrative_summary: string;
  strengths: string[];
  weaknesses: string[];
  top_improvements: string[];
  recommended_move_types: string[];
  insights: string[];
};

export async function fetchTeamIdentityLLM(
  teamAnalysis: TeamAnalysisResponse
): Promise<TeamIdentityLLMResponse> {
  const res = await fetch(`${API_BASE}/llm/openai/team-identity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_analysis: teamAnalysis }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data &&
      typeof data === "object" &&
      "detail" in data &&
      typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Team identity analysis failed (${res.status})`;
    throw new Error(detail);
  }
  return data as TeamIdentityLLMResponse;
}

export type TradeTargetsLLMResponse = {
  team_identity: string;
  narrative_summary: string;
  strengths: string[];
  weaknesses: string[];
  top_improvements: string[];
  recommended_move_types: string[];
  insights: string[];
  top_three_targets: Array<{
    name: string;
    rank: number;
    why_fit: string;
    trade_construction: string;
  }>;
  /** Trade-focused paragraph; complements narrative_summary. */
  summary: string;
  constraint_acknowledgment: string;
};

/** Full ``POST /team/analyze`` payload (includes ``trade_targets`` when sent). */
export async function fetchTradeTargetsLLM(
  teamAnalysis: TeamAnalysisResponse
): Promise<TradeTargetsLLMResponse> {
  const res = await fetch(`${API_BASE}/llm/openai/trade-targets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_analysis: teamAnalysis }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data &&
      typeof data === "object" &&
      "detail" in data &&
      typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Trade targets LLM failed (${res.status})`;
    throw new Error(detail);
  }
  return data as TradeTargetsLLMResponse;
}
