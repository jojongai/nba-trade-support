"use client";

import { useState, FormEvent } from "react";
import { Search, RefreshCw } from "lucide-react";
import { searchPlayers, apiPlayerToFantasyPlayer } from "@/lib/api";
import type { FantasyPlayer } from "@/types/players";
import { POSITIONS, TEAMS } from "@/types/players";
import dynamic from "next/dynamic";
import { PlayerCard } from "@/components/PlayerCard";

const TradeEvaluation = dynamic(
  () => import("@/components/TradeEvaluation").then((m) => ({ default: m.TradeEvaluation })),
  { ssr: false }
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function TradeAnalyzerPage() {
  const [myTeam, setMyTeam] = useState<FantasyPlayer[]>([]);
  const [tradingAway, setTradingAway] = useState<FantasyPlayer[]>([]);
  const [receiving, setReceiving] = useState<FantasyPlayer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [receiveSearchQuery, setReceiveSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [searchResults, setSearchResults] = useState<FantasyPlayer[]>([]);
  const [receiveSearchResults, setReceiveSearchResults] = useState<
    FantasyPlayer[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [receiveSearchLoading, setReceiveSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [receiveSearchError, setReceiveSearchError] = useState<string | null>(
    null
  );

  const runSearch = async (
    q: string,
    setResults: (r: FantasyPlayer[]) => void,
    setLoading: (b: boolean) => void,
    setError: (s: string | null) => void
  ) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const parts = trimmed.split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
      const apiPlayers = await searchPlayers(
        undefined,
        firstName,
        lastName,
        true
      );
      setResults(apiPlayers.map(apiPlayerToFantasyPlayer));
    } catch {
      setError(
        `Search failed. Is the backend running at ${API_BASE}?`
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMyTeamSearch = (e: FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery, setSearchResults, setSearchLoading, setSearchError);
  };

  const handleReceiveSearch = (e: FormEvent) => {
    e.preventDefault();
    runSearch(
      receiveSearchQuery,
      setReceiveSearchResults,
      setReceiveSearchLoading,
      setReceiveSearchError
    );
  };

  const filteredSearchResults = searchResults.filter(
    (p) => !myTeam.some((m) => m.id === p.id)
  );
  const filteredReceiveResults = receiveSearchResults.filter(
    (p) =>
      !myTeam.some((m) => m.id === p.id) &&
      !receiving.some((r) => r.id === p.id)
  );

  const addToMyTeam = (player: FantasyPlayer) => {
    if (!myTeam.some((p) => p.id === player.id)) {
      setMyTeam([...myTeam, player]);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const removeFromMyTeam = (playerId: string) => {
    setMyTeam(myTeam.filter((p) => p.id !== playerId));
    setTradingAway((t) => t.filter((p) => p.id !== playerId));
  };

  const addToTradingAway = (player: FantasyPlayer) => {
    if (!tradingAway.some((p) => p.id === player.id)) {
      setTradingAway([...tradingAway, player]);
    }
  };

  const removeFromTradingAway = (playerId: string) => {
    setTradingAway((t) => t.filter((p) => p.id !== playerId));
  };

  const addToReceiving = (player: FantasyPlayer) => {
    if (!receiving.some((p) => p.id === player.id)) {
      setReceiving([...receiving, player]);
      setReceiveSearchQuery("");
      setReceiveSearchResults([]);
    }
  };

  const removeFromReceiving = (playerId: string) => {
    setReceiving((r) => r.filter((p) => p.id !== playerId));
  };

  const resetTrade = () => {
    setTradingAway([]);
    setReceiving([]);
  };

  return (
    <div className="min-h-screen bg-[#0E1117] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Trade Analyzer</h1>
          <p className="text-gray-400">
            Build your roster with player search (backend). Propose trades to
            analyze impact. Fantasy stats appear when backend supports them.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Your Current Roster
              </h2>
              <span className="text-sm text-gray-400">{myTeam.length} players</span>
            </div>

            <form onSubmit={handleMyTeamSearch} className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search players (backend)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </form>

            <div className="flex items-center gap-2 mb-4">
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500"
              >
                {TEAMS.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            {searchError && (
              <p className="text-sm text-red-400 mb-2">{searchError}</p>
            )}

            {searchQuery && (
              <div className="mb-4 max-h-48 overflow-y-auto space-y-2 bg-gray-900/50 rounded-lg p-2 border border-gray-700">
                {searchLoading ? (
                  <div className="text-sm text-gray-400 py-2">Searching…</div>
                ) : (
                  <>
                    {filteredSearchResults.slice(0, 8).map((player) => (
                      <div
                        key={player.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => addToMyTeam(player)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && addToMyTeam(player)
                        }
                        className="p-2 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                            ?
                          </div>
                          <div>
                            <div className="text-sm text-white">
                              {player.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {player.id}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredSearchResults.length === 0 && !searchLoading && (
                      <div className="text-sm text-gray-400 text-center py-2">
                        No players found
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {myTeam.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Search and add players to your roster</p>
                </div>
              ) : (
                myTeam.map((player) => (
                  <div key={player.id} className="relative">
                    <PlayerCard
                      player={player}
                      onRemove={() => removeFromMyTeam(player.id)}
                      onClick={() => addToTradingAway(player)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Propose a Trade
              </h2>
              {(tradingAway.length > 0 || receiving.length > 0) && (
                <button
                  type="button"
                  onClick={resetTrade}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                Players You&apos;re Trading Away
              </h3>
              <div className="space-y-3 min-h-[200px] bg-gray-900/30 rounded-lg p-3 border border-gray-700">
                {tradingAway.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-sm">
                      Click players from your roster to add them here
                    </p>
                  </div>
                ) : (
                  tradingAway.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onRemove={() => removeFromTradingAway(player.id)}
                      showTradeValue
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                Players You&apos;re Receiving
              </h3>
              <form onSubmit={handleReceiveSearch} className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players to receive..."
                  value={receiveSearchQuery}
                  onChange={(e) => setReceiveSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </form>
              {receiveSearchError && (
                <p className="text-sm text-red-400 mb-2">{receiveSearchError}</p>
              )}
              {receiveSearchQuery && (
                <div className="mb-3 max-h-48 overflow-y-auto space-y-2 bg-gray-900/50 rounded-lg p-2 border border-gray-700">
                  {receiveSearchLoading ? (
                    <div className="text-sm text-gray-400 py-2">
                      Searching…
                    </div>
                  ) : (
                    filteredReceiveResults.slice(0, 8).map((player) => (
                      <div
                        key={player.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => addToReceiving(player)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && addToReceiving(player)
                        }
                        className="p-2 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                            ?
                          </div>
                          <div>
                            <div className="text-sm text-white">
                              {player.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {player.id}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className="space-y-3 min-h-[200px] bg-gray-900/30 rounded-lg p-3 border border-gray-700">
                {receiving.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-sm">
                      Search and add players you want to receive
                    </p>
                  </div>
                ) : (
                  receiving.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onRemove={() => removeFromReceiving(player.id)}
                      showTradeValue
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <TradeEvaluation tradingAway={tradingAway} receiving={receiving} />
      </div>
    </div>
  );
}
