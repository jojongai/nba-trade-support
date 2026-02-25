"use client";

import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { fetchRankings, fetchTeams, type RankingRow, type Team } from "@/lib/api";

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
  const [usePerGameStats, setUsePerGameStats] = useState(false);

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

  const totalPages = Math.max(1, Math.ceil(filteredRankings.length / PAGE_SIZE));
  const paginatedRankings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRankings.slice(start, start + PAGE_SIZE);
  }, [filteredRankings, currentPage]);

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
              General
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
              Saved Settings
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
              <thead className="bg-gray-900/50 border-b border-gray-700">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading && (
                  <tr>
                    <td colSpan={15} className="px-3 py-16 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td colSpan={15} className="px-3 py-16 text-center text-red-400">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && rankings.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-3 py-16 text-center text-gray-500">
                      No rankings data available.
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredRankings.length === 0 && rankings.length > 0 && (
                  <tr>
                    <td colSpan={15} className="px-3 py-16 text-center text-gray-500">
                      No players match your filters.
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredRankings.length > 0 && paginatedRankings.map((row) => (
                  <tr key={row.player_id} className="hover:bg-gray-800/50">
                    <td className="px-3 py-3 text-center text-gray-300">{row.rank}</td>
                    <td className="px-3 py-3 font-medium text-white">{row.full_name}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{display(row.team_abbreviation)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{display(row.position)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayNum(row.GP)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayNum(row.MPG)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayPct(row.FG_PCT)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayPct(row.FT_PCT)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayStat(getStatValue(row, "FG3M"), usePerGameStats)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayStat(getStatValue(row, "PTS"), usePerGameStats)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayStat(getStatValue(row, "REB"), usePerGameStats)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayStat(getStatValue(row, "AST"), usePerGameStats)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayStat(getStatValue(row, "STL"), usePerGameStats)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayStat(getStatValue(row, "BLK"), usePerGameStats)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{displayStat(getStatValue(row, "TOV"), usePerGameStats)}</td>
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
