"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { fetchRankings } from "@/lib/api";

export default function PlayerRankingsPage() {
  const [rankings, setRankings] = useState<Awaited<ReturnType<typeof fetchRankings>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRankings()
      .then((data) => {
        if (!cancelled) setRankings(data);
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
                disabled
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 opacity-60 cursor-not-allowed"
              />
            </div>
            <div className="relative">
              <select
                disabled
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 appearance-none opacity-60 cursor-not-allowed"
              >
                <option>All Positions</option>
              </select>
            </div>
            <div className="relative">
              <select
                disabled
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 appearance-none opacity-60 cursor-not-allowed"
              >
                <option>All Teams</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            Search and filters coming later.
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Team</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pos</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">GP</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">MPG</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">FG%</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">FT%</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">3PM</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">PTS</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">REB</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">AST</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">STL</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">BLK</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading && (
                  <tr>
                    <td colSpan={15} className="px-6 py-16 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td colSpan={15} className="px-6 py-16 text-center text-red-400">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && rankings.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-6 py-16 text-center text-gray-500">
                      No rankings data available.
                    </td>
                  </tr>
                )}
                {!loading && !error && rankings.length > 0 && rankings.map((row) => (
                  <tr key={row.player_id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-gray-300">{row.rank}</td>
                    <td className="px-6 py-4 font-medium text-white">{row.full_name}</td>
                    <td className="px-6 py-4 text-gray-400">{display(row.team_abbreviation)}</td>
                    <td className="px-6 py-4 text-gray-400">—</td>
                    <td className="px-6 py-4 text-gray-400">{displayNum(row.GP)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayNum(row.MPG)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayPct(row.FG_PCT)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayPct(row.FT_PCT)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayNum(row.FG3M)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayNum(row.PTS)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayNum(row.REB)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayNum(row.AST)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayNum(row.STL)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayNum(row.BLK)}</td>
                    <td className="px-6 py-4 text-gray-400">{displayNum(row.TOV)}</td>
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
