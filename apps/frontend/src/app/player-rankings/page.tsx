"use client";

import { Search } from "lucide-react";

export default function PlayerRankingsPage() {
  return (
    <div className="min-h-screen bg-[#0E1117] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Player Rankings</h1>
          <p className="text-gray-400">
            Fantasy basketball rankings with stats and trade values. No backend
            connected yet — functionality coming later.
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
            Connect a rankings backend to enable search and filters.
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Pos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    PPG
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    RPG
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    APG
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Trade Value
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {/* No data row */}
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-16 text-center text-gray-500"
                  >
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No rankings data available</p>
                    <p className="text-sm mt-1">
                      Connect a backend that provides fantasy rankings to see
                      players here.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
