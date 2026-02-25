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
  FG3M?: number;
  PTS?: number;
  REB?: number;
  AST?: number;
  STL?: number;
  BLK?: number;
  TOV?: number;
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
