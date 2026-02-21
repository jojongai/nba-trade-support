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
