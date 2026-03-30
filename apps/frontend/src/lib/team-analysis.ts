/**
 * Build payloads for POST /team/analyze from Trade Analyzer roster + rankings.
 */
import type { RankingRow, TeamAnalyzeRosterPlayer } from "@/lib/api";
import { eligiblePositionsForDraft, projectionsFromRankingRow } from "@/lib/draft-sim";
import type { FantasyPlayer } from "@/types/players";

/** Trade value by player id for ``POST /team/analyze`` ``player_values`` (full rankings coverage). */
export function buildPlayerTradeValuesMap(
  rankings: RankingRow[],
  tradeValueMap: Map<number, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rankings) {
    const v = tradeValueMap.get(row.player_id);
    if (v != null && !Number.isNaN(v)) {
      out[String(row.player_id)] = v;
    }
  }
  return out;
}

export function buildRosterPlayersForTeamAnalysis(
  rosterSlots: { position: string; player: FantasyPlayer | null }[],
  rankings: RankingRow[],
  tradeValueMap: Map<number, number>
): {
  roster_players: TeamAnalyzeRosterPlayer[];
  roster_slots: { slot_label: string; player_id: string | null }[];
} {
  const byId = new Map(rankings.map((r) => [r.player_id, r]));
  const roster_slots = rosterSlots.map((s) => ({
    slot_label: s.position,
    player_id: s.player?.id ?? null,
  }));

  const seen = new Set<string>();
  const roster_players: TeamAnalyzeRosterPlayer[] = [];

  for (const slot of rosterSlots) {
    if (!slot.player) continue;
    const pid = slot.player.id;
    if (seen.has(pid)) continue;
    seen.add(pid);
    const idNum = parseInt(pid, 10);
    const row = byId.get(idNum);
    const val = tradeValueMap.get(idNum) ?? 0;
    const elig = eligiblePositionsForDraft(row?.position ?? slot.player.position);
    const proj = row ? projectionsFromRankingRow(row) : {};
    roster_players.push({
      player_id: pid,
      name: slot.player.name ?? row?.full_name ?? "",
      eligible_positions: elig,
      value: val,
      ...proj,
    });
  }

  return { roster_players, roster_slots };
}
