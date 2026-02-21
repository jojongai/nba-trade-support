"use client";

import { useState } from "react";
import {
  Save,
  Settings,
  Users,
  Trophy,
  DollarSign,
  Calendar,
} from "lucide-react";

export default function LeagueSettingsPage() {
  const [leagueName, setLeagueName] = useState("My Fantasy League");
  const [scoringType, setScoringType] = useState<
    "points" | "9-cat" | "custom"
  >("points");
  const [leagueSize, setLeagueSize] = useState(12);
  const [playoffTeams, setPlayoffTeams] = useState(6);
  const [salaryCap, setSalaryCap] = useState(false);
  const [keeperLeague, setKeeperLeague] = useState(false);
  const [maxKeepers, setMaxKeepers] = useState(3);
  const [tradeDeadline, setTradeDeadline] = useState("2026-03-15");

  const handleSave = () => {
    // No backend — UI only for now
    alert("League settings (no backend). Save functionality not implemented yet.");
  };

  return (
    <div className="min-h-screen bg-[#0E1117] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            League Settings
          </h1>
          <p className="text-gray-400">
            Configure your fantasy league preferences. No backend connected —
            settings are not persisted.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-orange-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Basic Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  League Name
                </label>
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scoring Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["points", "9-cat", "custom"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setScoringType(type)}
                      className={`px-4 py-3 rounded-lg border transition-colors ${
                        scoringType === type
                          ? "bg-orange-500/20 border-orange-500 text-orange-400"
                          : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {type === "9-cat" ? "9-Category" : type === "custom" ? "Custom" : "Points"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                League Structure
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  League Size
                </label>
                <select
                  value={leagueSize}
                  onChange={(e) => setLeagueSize(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  {[8, 10, 12, 14, 16].map((size) => (
                    <option key={size} value={size}>
                      {size} Teams
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Playoff Teams
                </label>
                <select
                  value={playoffTeams}
                  onChange={(e) => setPlayoffTeams(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  {[4, 6, 8].map((teams) => (
                    <option key={teams} value={teams}>
                      {teams} Teams
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Advanced Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="font-medium text-white">Salary Cap Mode</div>
                    <div className="text-sm text-gray-400">
                      Enable salary cap restrictions
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={salaryCap}
                    onChange={(e) => setSalaryCap(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="font-medium text-white">Keeper League</div>
                    <div className="text-sm text-gray-400">
                      Allow keeping players between seasons
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keeperLeague}
                    onChange={(e) => setKeeperLeague(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
                </label>
              </div>
              {keeperLeague && (
                <div className="ml-8">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Maximum Keepers per Team
                  </label>
                  <select
                    value={maxKeepers}
                    onChange={(e) => setMaxKeepers(Number(e.target.value))}
                    className="w-full md:w-48 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {num} Players
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Trade Settings
              </h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trade Deadline
              </label>
              <input
                type="date"
                value={tradeDeadline}
                onChange={(e) => setTradeDeadline(e.target.value)}
                className="w-full md:w-64 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
              />
              <p className="text-sm text-gray-400 mt-2">
                No trades can be processed after this date
              </p>
            </div>
          </div>

          {scoringType === "custom" && (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Custom Scoring
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Points", default: 1 },
                  { label: "Rebounds", default: 1.2 },
                  { label: "Assists", default: 1.5 },
                  { label: "Steals", default: 3 },
                  { label: "Blocks", default: 3 },
                  { label: "Turnovers", default: -1 },
                  { label: "3PM", default: 3 },
                  { label: "FTM", default: 1 },
                ].map((stat) => (
                  <div key={stat.label}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {stat.label}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={stat.default}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-orange-500/20"
            >
              <Save className="w-5 h-5" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
