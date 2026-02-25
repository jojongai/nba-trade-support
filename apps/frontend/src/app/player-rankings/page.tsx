"use client";

import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { fetchRankings, fetchTeams, type RankingRow, type Team } from "@/lib/api";
import { getSavedPointsWeights } from "@/lib/league-settings";

export default function PlayerRankingsPage() {
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rankingFormat, setRankingFormat] = useState<"general" | "saved">("general");
  const [usePerGameStats, setUsePerGameStats] = useState(true);

  const PAGE_SIZE = 50;

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRankings(), fetchTeams()])
      .then(([rankingsData, teamsData]) => {
        if (!cancelled) {
          setRankings(rankingsData);
          setTeams(teamsData);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const positions = useMemo(() => {
    const set = new Set<string>();
    rankings.forEach((r) => {
      const p = r.position?.trim();
      if (p && p !== "—") set.add(p);
    });
    return Array.from(set).sort();
  }, [rankings]);

  const filteredRankings = useMemo(() => {
    return rankings.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!(row.full_name || "").toLowerCase().includes(q)) return false;
      }
      if (positionFilter) {
        if ((row.position || "").trim() !== positionFilter) return false;
      }
      if (teamFilter) {
        if ((row.team_abbreviation || "").trim() !== teamFilter) return false;
      }
      return true;
    });
  }, [rankings, searchQuery, positionFilter, teamFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, positionFilter, teamFilter]);

  const display = (v: number | string | undefined) =>
    v === undefined || v === "" ? "—" : String(v);
  const displayPct = (v: number | undefined) =>
    v === undefined || v === 0 ? "—" : `${(v * 100).toFixed(1)}%`;
  const displayNum = (v: number | undefined) =>
    v === undefined || v === 0 ? "—" : String(v);
  const displayStat = (value: number | undefined, perGame: boolean) =>
    value === undefined ? "—" : perGame ? (value).toFixed(1) : String(value);

  const getStatValue = (row: RankingRow, key: keyof Pick<RankingRow, "FG3M" | "PTS" | "REB" | "AST" | "STL" | "BLK" | "TOV">) => {
    const v = row[key] ?? 0;
    const gp = row.GP || 1;
    return usePerGameStats ? (Number(v) / gp) : Number(v);
  };

  type StatKey = "FG3M" | "PTS" | "REB" | "AST" | "STL" | "BLK" | "TOV";
  type PctKey = "FG_PCT" | "FT_PCT";
  const STAT_KEYS: StatKey[] = ["FG3M", "PTS", "REB", "AST", "STL", "BLK", "TOV"];
  const NEGATIVE_STAT = new Set<StatKey>(["TOV"]);

  const sortedValuesByStat = useMemo(() => {
    const out: Record<StatKey | PctKey, number[]> = {} as Record<StatKey | PctKey, number[]>;
    for (const key of STAT_KEYS) {
      const values = filteredRankings
        .map((r) => {
          const v = r[key] ?? 0;
          const gp = r.GP || 1;
          return usePerGameStats ? Number(v) / gp : Number(v);
        })
        .filter((v) => v != null && !Number.isNaN(v));
      out[key] = [...values].sort((a, b) => a - b);
    }
    for (const key of ["FG_PCT", "FT_PCT"] as PctKey[]) {
      const values = filteredRankings
        .map((r) => r[key] as number | undefined)
        .filter((v): v is number => v != null && !Number.isNaN(v));
      out[key] = [...values].sort((a, b) => a - b);
    }
    return out;
  }, [filteredRankings, usePerGameStats]);

  const getPercentile = (value: number, sorted: number[], isNegative: boolean): number => {
    if (sorted.length <= 1) return 0.5;
    const n = sorted.length;
    const idx = sorted.lastIndexOf(value);
    const index = idx === -1 ? sorted.findIndex((x) => x >= value) : idx;
    const i = index === -1 ? n - 1 : index;
    const p = i / (n - 1);
    return isNegative ? 1 - p : p;
  };

  const getPercentileColorClass = (percentile: number): string => {
    if (percentile <= 0.15) return "text-red-500";
    if (percentile <= 0.30) return "text-red-700";
    if (percentile >= 0.90) return "text-green-400";
    if (percentile >= 0.80) return "text-green-700";
    return "text-gray-400";
  };

  const getStatCellClass = (row: RankingRow, key: StatKey): string => {
    const value = getStatValue(row, key);
    const sorted = sortedValuesByStat[key];
    if (!sorted?.length) return "text-gray-400";
    const p = getPercentile(value, sorted, NEGATIVE_STAT.has(key));
    return getPercentileColorClass(p);
  };

  const getPctCellClass = (row: RankingRow, key: PctKey): string => {
    const value = Number(row[key]);
    const sorted = sortedValuesByStat[key];
    if (!sorted?.length || value == null || Number.isNaN(value)) return "text-gray-400";
    const p = getPercentile(value, sorted, false);
    return getPercentileColorClass(p);
  };

  // --- Value score: points league uses FGM/FGA/FTM/FTA; categories use FG_PCT/FT_PCT ---
  const VALUE_STAT_KEYS_GENERAL = ["PTS", "REB", "AST", "STL", "BLK", "FG3M", "FG_PCT", "FT_PCT", "TOV"] as const;
  const VALUE_STAT_KEYS_POINTS = ["PTS", "REB", "AST", "STL", "BLK", "FG3M", "TOV", "FGM", "FGA", "FTM", "FTA"] as const;
  type ValueStatKeyGeneral = (typeof VALUE_STAT_KEYS_GENERAL)[number];
  type ValueStatKeyPoints = (typeof VALUE_STAT_KEYS_POINTS)[number];
  type ValueStatKey = ValueStatKeyGeneral | ValueStatKeyPoints;

  const valueStatKeys = rankingFormat === "saved" ? VALUE_STAT_KEYS_POINTS : VALUE_STAT_KEYS_GENERAL;
  const VALUE_LOWER_IS_BETTER_GENERAL = new Set<ValueStatKey>(["TOV"]);
  const VALUE_LOWER_IS_BETTER_POINTS = new Set<ValueStatKey>(["TOV", "FGA", "FTA"]);
  const valueLowerIsBetter = rankingFormat === "saved" ? VALUE_LOWER_IS_BETTER_POINTS : VALUE_LOWER_IS_BETTER_GENERAL;

  /** Map league-settings point keys to ranking row stat keys (for points/saved mode). */
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

  const valueWeights: Record<ValueStatKey, number> = useMemo(() => {
    if (rankingFormat === "saved") {
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
            w[statKey as ValueStatKeyPoints] = (statKey === "TOV" || statKey === "FGA" || statKey === "FTA") ? Math.abs(v) : v;
          }
        }
        return w;
      }
    }
    return {
      PTS: 1, REB: 1, AST: 1, STL: 1, BLK: 1, FG3M: 1, FG_PCT: 1, FT_PCT: 1, TOV: 1,
      FGM: 1, FGA: 1, FTM: 1, FTA: 1,
    };
  }, [rankingFormat]);

  const getValueStatNumber = (row: RankingRow, key: ValueStatKey): number => {
    if (key === "FG_PCT" || key === "FT_PCT") return Number(row[key]) ?? 0;
    const v = row[key as keyof RankingRow] ?? 0;
    const gp = row.GP || 1;
    return Number(v) / gp;
  };

  const zScoresByPlayerId = useMemo(() => {
    const players = filteredRankings;
    const means: Record<string, number> = {};
    const stds: Record<string, number> = {};

    for (const stat of valueStatKeys) {
      const values = players
        .map((r) => getValueStatNumber(r, stat))
        .filter((v) => v != null && !Number.isNaN(v));
      const n = values.length;
      const mean = n ? values.reduce((a, b) => a + b, 0) / n : 0;
      means[stat] = mean;
      const variance = n ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n : 0;
      stds[stat] = Math.sqrt(variance) || 1e-6;
    }

    const map = new Map<number, Record<string, number>>();
    for (const row of players) {
      const zScores: Record<string, number> = {};
      for (const stat of valueStatKeys) {
        const v = getValueStatNumber(row, stat);
        const mean = means[stat];
        const std = stds[stat];
        const lowerIsBetter = valueLowerIsBetter.has(stat);
        const z = lowerIsBetter ? (mean - v) / std : (v - mean) / std;
        zScores[stat] = z;
      }
      map.set(row.player_id, zScores);
    }
    return map;
  }, [filteredRankings, rankingFormat]);

  const valueScoreByPlayerId = useMemo(() => {
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
  }, [zScoresByPlayerId, valueWeights, rankingFormat]);

  const getValueScore = (playerId: number): number | undefined => valueScoreByPlayerId.get(playerId);

  const rankingsSortedByValue = useMemo(() => {
    return [...filteredRankings].sort((a, b) => {
      const va = getValueScore(a.player_id) ?? -Infinity;
      const vb = getValueScore(b.player_id) ?? -Infinity;
      return vb - va;
    });
  }, [filteredRankings, valueScoreByPlayerId]);

  const totalPages = Math.max(1, Math.ceil(rankingsSortedByValue.length / PAGE_SIZE));
  const paginatedRankings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rankingsSortedByValue.slice(start, start + PAGE_SIZE);
  }, [rankingsSortedByValue, currentPage]);

  return (
    <div className="min-h-screen bg-[#0E1117] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">Player Rankings</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Rankings Based On:</span>
            <div className="flex items-center gap-2">
              <button
              type="button"
              onClick={() => setRankingFormat("general")}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#0E1117] ${
                rankingFormat === "general"
                  ? "border-orange-500 bg-orange-500/20 text-orange-400"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
              }`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => setRankingFormat("saved")}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#0E1117] ${
                rankingFormat === "saved"
                  ? "border-orange-500 bg-orange-500/20 text-orange-400"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
              }`}
            >
              Points (Saved Settings)
            </button>
          </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_0.6fr_1fr] w-full gap-3">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="relative min-w-0">
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full h-10 pl-3 pr-8 text-sm bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 appearance-none"
              >
                <option value="">All Positions</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative min-w-0">
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full h-10 pl-3 pr-8 text-sm bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 appearance-none"
              >
                <option value="">All Teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.abbreviation}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPositionFilter("");
                  setTeamFilter("");
                }}
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-orange-500 focus:outline-none focus:border-orange-500 transition-colors flex items-center justify-center"
              >
                Reset
              </button>
            </div>
            <div className="min-w-0 flex items-center gap-2 h-10">
              <div className="flex items-center gap-1.5 h-10">
                <button
                  type="button"
                  onClick={() => setUsePerGameStats(false)}
                  className={`h-10 px-2.5 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center ${
                    !usePerGameStats
                      ? "border border-orange-500 bg-orange-500/20 text-orange-400"
                      : "border border-gray-700 bg-gray-900/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
                  }`}
                >
                  Total Stats
                </button>
                <button
                  type="button"
                  onClick={() => setUsePerGameStats(true)}
                  className={`h-10 px-2.5 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center ${
                    usePerGameStats
                      ? "border border-orange-500 bg-orange-500/20 text-orange-400"
                      : "border border-gray-700 bg-gray-900/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
                  }`}
                >
                  Per Game Stats
                </button>
              </div>
            </div>
          </div>
          {(searchQuery || positionFilter || teamFilter) && (
            <div className="mt-4 text-sm text-gray-400">
              Showing {filteredRankings.length} of {rankings.length} players
            </div>
          )}
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 shadow-[0_1px_3px_0_rgba(0,0,0,0.3)]">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Rank</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Team</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Pos</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">GP</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">MPG</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">FG%</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">FT%</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{usePerGameStats ? "3PG" : "3PM"}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{usePerGameStats ? "PPG" : "PTS"}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{usePerGameStats ? "RPG" : "REB"}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{usePerGameStats ? "APG" : "AST"}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{usePerGameStats ? "STLPG" : "STL"}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{usePerGameStats ? "BLKPG" : "BLK"}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{usePerGameStats ? "TO/PG" : "TO"}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading && (
                  <tr>
                    <td colSpan={16} className="px-3 py-16 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td colSpan={16} className="px-3 py-16 text-center text-red-400">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && rankings.length === 0 && (
                  <tr>
                    <td colSpan={16} className="px-3 py-16 text-center text-gray-500">
                      No rankings data available.
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredRankings.length === 0 && rankings.length > 0 && (
                  <tr>
                    <td colSpan={16} className="px-3 py-16 text-center text-gray-500">
                      No players match your filters.
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredRankings.length > 0 && paginatedRankings.map((row, index) => (
                  <tr key={row.player_id} className="hover:bg-gray-800/50">
                    <td className="px-3 py-3 text-center text-gray-300">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-3 py-3 font-medium text-white">{row.full_name}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{display(row.team_abbreviation)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{display(row.position)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayNum(row.GP)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayNum(row.MPG)}</td>
                    <td className={`px-3 py-3 text-center ${getPctCellClass(row, "FG_PCT")}`}>{displayPct(row.FG_PCT)}</td>
                    <td className={`px-3 py-3 text-center ${getPctCellClass(row, "FT_PCT")}`}>{displayPct(row.FT_PCT)}</td>
                    <td className={`px-3 py-3 text-center ${getStatCellClass(row, "FG3M")}`}>{displayStat(getStatValue(row, "FG3M"), usePerGameStats)}</td>
                    <td className={`px-3 py-3 text-center ${getStatCellClass(row, "PTS")}`}>{displayStat(getStatValue(row, "PTS"), usePerGameStats)}</td>
                    <td className={`px-3 py-3 text-center ${getStatCellClass(row, "REB")}`}>{displayStat(getStatValue(row, "REB"), usePerGameStats)}</td>
                    <td className={`px-3 py-3 text-center ${getStatCellClass(row, "AST")}`}>{displayStat(getStatValue(row, "AST"), usePerGameStats)}</td>
                    <td className={`px-3 py-3 text-center ${getStatCellClass(row, "STL")}`}>{displayStat(getStatValue(row, "STL"), usePerGameStats)}</td>
                    <td className={`px-3 py-3 text-center ${getStatCellClass(row, "BLK")}`}>{displayStat(getStatValue(row, "BLK"), usePerGameStats)}</td>
                    <td className={`px-3 py-3 text-center ${getStatCellClass(row, "TOV")}`}>{displayStat(getStatValue(row, "TOV"), usePerGameStats)}</td>
                    <td className="px-3 py-3 text-center text-gray-300">
                      {(() => {
                        const v = getValueScore(row.player_id);
                        return v != null ? v.toFixed(2) : "—";
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !error && filteredRankings.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 py-4 border-t border-gray-700 bg-gray-900/30">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800/50 disabled:hover:text-gray-300 focus:outline-none focus:border-orange-500 transition-colors"
                aria-label="Previous page"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
                <span className="ml-2 text-gray-500">
                  ({(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRankings.length)} of {filteredRankings.length})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800/50 disabled:hover:text-gray-300 focus:outline-none focus:border-orange-500 transition-colors"
                aria-label="Next page"
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
