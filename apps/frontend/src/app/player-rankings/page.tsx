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

  const display = (v: number | string | undefined) =>
    v === undefined || v === "" ? "—" : String(v);
  const displayPct = (v: number | undefined) =>
    v === undefined || v === 0 ? "—" : `${(v * 100).toFixed(1)}%`;
  const displayNum = (v: number | undefined) =>
    v === undefined || v === 0 ? "—" : String(v);

  return (
    <div className="min-h-screen bg-[#0E1117] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Player Rankings</h1>
          <p className="text-gray-400">
            Fantasy basketball rankings. Active players from the API; stats will
            map to career data when available.
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="relative">
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 appearance-none"
              >
                <option value="">All Positions</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 appearance-none"
              >
                <option value="">All Teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.abbreviation}>
                    {t.full_name}
                  </option>
                ))}
              </select>
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Rank</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Team</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pos</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">GP</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">MPG</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">FG%</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">FT%</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">3PM</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">PTS</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">REB</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">AST</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">STL</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">BLK</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TO</th>
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
                {!loading && !error && filteredRankings.length > 0 && filteredRankings.map((row) => (
                  <tr key={row.player_id} className="hover:bg-gray-800/50">
                    <td className="px-3 py-3 text-gray-300">{row.rank}</td>
                    <td className="px-3 py-3 font-medium text-white">{row.full_name}</td>
                    <td className="px-3 py-3 text-gray-400">{display(row.team_abbreviation)}</td>
                    <td className="px-3 py-3 text-gray-400">{display(row.position)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayNum(row.GP)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayNum(row.MPG)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayPct(row.FG_PCT)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayPct(row.FT_PCT)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayNum(row.FG3M)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayNum(row.PTS)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayNum(row.REB)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayNum(row.AST)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayNum(row.STL)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayNum(row.BLK)}</td>
                    <td className="px-3 py-3 text-gray-400">{displayNum(row.TOV)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
