"use client";

import type { FantasyPlayer } from "@/types/players";
import type { RankingRow } from "@/lib/api";
import { getLeagueSettings } from "@/lib/league-settings";
import { buildTradeContextForLLM, type RosterSlotInput } from "@/lib/trade-context";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Crosshair,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface TradeEvaluationProps {
  tradingAway: FantasyPlayer[];
  receiving: FantasyPlayer[];
  rankings?: RankingRow[];
  rosterSlots?: RosterSlotInput[];
}

function getRankingRow(rankings: RankingRow[], playerId: string): RankingRow | undefined {
  const pid = parseInt(playerId, 10);
  return rankings.find((r) => r.player_id === pid);
}

function sumStatFromRankings(
  players: FantasyPlayer[],
  rankings: RankingRow[],
  statKey: keyof Pick<RankingRow, "PTS" | "REB" | "AST" | "STL" | "BLK" | "FG3M" | "TOV">
): number {
  return players.reduce((acc, p) => {
    const r = getRankingRow(rankings, p.id);
    const gp = r?.GP ?? 1;
    const val = r?.[statKey] ?? 0;
    return acc + (gp > 0 ? val / gp : 0);
  }, 0);
}

function avgPctFromRankings(
  players: FantasyPlayer[],
  rankings: RankingRow[],
  statKey: "FG_PCT" | "FT_PCT"
): number {
  if (players.length === 0) return 0;
  const sum = players.reduce((acc, p) => {
    const r = getRankingRow(rankings, p.id);
    const val = r?.[statKey];
    return acc + (typeof val === "number" && !Number.isNaN(val) ? val : 0);
  }, 0);
  const count = players.filter((p) => {
    const r = getRankingRow(rankings, p.id);
    const val = r?.[statKey];
    return typeof val === "number" && !Number.isNaN(val);
  }).length;
  return count > 0 ? sum / count : 0;
}

export function TradeEvaluation({
  tradingAway,
  receiving,
  rankings = [],
  rosterSlots = [],
}: TradeEvaluationProps) {
  const [showInsights, setShowInsights] = useState(false);
  const [statsPlayerId, setStatsPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!statsPlayerId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStatsPlayerId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [statsPlayerId]);

  const leagueSettings = getLeagueSettings();
  const llmContextRef = useRef<ReturnType<typeof buildTradeContextForLLM> | null>(null);
  const tradeContext = buildTradeContextForLLM(tradingAway, receiving, rankings, {
    useSavedWeights: true,
    rosterSlots,
    leagueSettings,
  });
  llmContextRef.current = tradeContext;
  const otherTargets = tradeContext.other_players_to_target;
  const statsRow = statsPlayerId ? getRankingRow(rankings, statsPlayerId) : undefined;

  if (tradingAway.length === 0 || receiving.length === 0) {
    return null;
  }

  const awayPpg = sumStatFromRankings(tradingAway, rankings, "PTS");
  const awayRpg = sumStatFromRankings(tradingAway, rankings, "REB");
  const awayApg = sumStatFromRankings(tradingAway, rankings, "AST");
  const awaySpg = sumStatFromRankings(tradingAway, rankings, "STL");
  const awayBpg = sumStatFromRankings(tradingAway, rankings, "BLK");
  const awayFg3m = sumStatFromRankings(tradingAway, rankings, "FG3M");
  const awayTov = sumStatFromRankings(tradingAway, rankings, "TOV");
  const awayFgPct = avgPctFromRankings(tradingAway, rankings, "FG_PCT");
  const awayFtPct = avgPctFromRankings(tradingAway, rankings, "FT_PCT");

  const recvPpg = sumStatFromRankings(receiving, rankings, "PTS");
  const recvRpg = sumStatFromRankings(receiving, rankings, "REB");
  const recvApg = sumStatFromRankings(receiving, rankings, "AST");
  const recvSpg = sumStatFromRankings(receiving, rankings, "STL");
  const recvBpg = sumStatFromRankings(receiving, rankings, "BLK");
  const recvFg3m = sumStatFromRankings(receiving, rankings, "FG3M");
  const recvTov = sumStatFromRankings(receiving, rankings, "TOV");
  const recvFgPct = avgPctFromRankings(receiving, rankings, "FG_PCT");
  const recvFtPct = avgPctFromRankings(receiving, rankings, "FT_PCT");

  const deltas = {
    ppg: recvPpg - awayPpg,
    rpg: recvRpg - awayRpg,
    apg: recvApg - awayApg,
    spg: recvSpg - awaySpg,
    bpg: recvBpg - awayBpg,
    fg3m: recvFg3m - awayFg3m,
    tov: recvTov - awayTov,
    fg_pct: recvFgPct - awayFgPct,
    ft_pct: recvFtPct - awayFtPct,
  };

  const awayValue = tradingAway.reduce((s, p) => s + (p.tradeValue ?? 0), 0);
  const recvValue = receiving.reduce((s, p) => s + (p.tradeValue ?? 0), 0);
  const awayVol =
    tradingAway.length > 0
      ? tradingAway.reduce((a, p) => a + (p.volatility ?? 0), 0) / tradingAway.length
      : 0;
  const recvVol =
    receiving.length > 0
      ? receiving.reduce((a, p) => a + (p.volatility ?? 0), 0) / receiving.length
      : 0;
  const volatilityDelta = recvVol - awayVol;

  const hasAnyStats =
    awayPpg > 0 || awayRpg > 0 || awayApg > 0 ||
    recvPpg > 0 || recvRpg > 0 || recvApg > 0;

  const radarData = [
    { category: "Points", before: awayPpg, after: recvPpg },
    { category: "Rebounds", before: awayRpg, after: recvRpg },
    { category: "Assists", before: awayApg, after: recvApg },
    { category: "Value", before: awayValue, after: recvValue },
  ];

  const barData = [
    { name: "PPG", change: deltas.ppg },
    { name: "RPG", change: deltas.rpg },
    { name: "APG", change: deltas.apg },
    { name: "SPG", change: deltas.spg },
    { name: "BPG", change: deltas.bpg },
    { name: "3PM", change: deltas.fg3m },
    { name: "TOV", change: deltas.tov },
    { name: "FG%", change: deltas.fg_pct },
    { name: "FT%", change: deltas.ft_pct },
  ];

  const getChangeIndicator = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return "text-green-400";
    if (value < 0) return "text-red-400";
    return "text-gray-400";
  };

  const generateInsights = (): string[] => {
    if (!hasAnyStats) {
      return [
        "Fantasy stats are not available from the backend. Connect a data source for trade insights.",
      ];
    }
    const insights: string[] = [];
    if (deltas.ppg > 5) insights.push("This trade significantly improves your scoring.");
    else if (deltas.ppg < -5) insights.push("This trade weakens your scoring depth.");
    if (deltas.apg > 3) insights.push("Your assist production will increase substantially.");
    else if (deltas.apg < -3) insights.push("Consider your playmaking needs — this trade reduces assists.");
    if (deltas.rpg > 3) insights.push("Rebounding gets a boost with this trade.");
    else if (deltas.rpg < -3) insights.push("This trade weakens rebounding depth.");
    if (deltas.spg > 1) insights.push("Steals production improves.");
    if (deltas.bpg > 0.5) insights.push("Blocks get a boost.");
    if (volatilityDelta > 10) insights.push("⚠️ Injury risk increases with this trade.");
    else if (volatilityDelta < -10) insights.push("✅ This trade reduces your injury risk exposure.");
    if (insights.length === 0) insights.push("This appears to be a relatively balanced trade.");
    return insights;
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 overflow-visible">
        <h2 className="text-xl font-bold text-white mb-6">Trade Summary</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 overflow-visible">
          {[
            { key: "ppg", label: "PPG", plain: "Points per game", value: deltas.ppg, decimals: 1 },
            { key: "rpg", label: "RPG", plain: "Rebounds per game", value: deltas.rpg, decimals: 1 },
            { key: "apg", label: "APG", plain: "Assists per game", value: deltas.apg, decimals: 1 },
            { key: "spg", label: "SPG", plain: "Steals per game", value: deltas.spg, decimals: 2 },
            { key: "bpg", label: "BPG", plain: "Blocks per game", value: deltas.bpg, decimals: 2 },
            { key: "fg3m", label: "3PM", plain: "Three-pointers made per game", value: deltas.fg3m, decimals: 2 },
            { key: "tov", label: "TOV", plain: "Turnovers per game", value: deltas.tov, decimals: 2, inverted: true },
            { key: "fg_pct", label: "FG%", plain: "Field goal percentage", value: deltas.fg_pct, decimals: 1, pct: true },
            { key: "ft_pct", label: "FT%", plain: "Free throw percentage", value: deltas.ft_pct, decimals: 1, pct: true },
          ].map(({ key, label, plain, value, decimals, inverted, pct }) => {
            const displayVal = pct ? (value * 100).toFixed(decimals) : value.toFixed(decimals);
            const colorVal = inverted ? -value : value;
            return (
              <div
                key={key}
                className="group relative overflow-visible bg-gray-900/50 rounded-lg p-3 border border-gray-700"
              >
                <span
                  className="pointer-events-none absolute z-30 left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] w-max max-w-[min(100vw-2rem,14rem)] rounded-md bg-gray-800 px-2.5 py-1.5 text-center text-xs leading-snug text-gray-100 shadow-lg ring-1 ring-gray-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  role="tooltip"
                >
                  {plain}
                </span>
                <div className="text-xs text-gray-400 mb-1">{label} Δ</div>
                <div className={`text-lg font-bold flex items-center gap-1.5 ${getChangeColor(colorVal)}`}>
                  {getChangeIndicator(colorVal)}
                  {value > 0 ? "+" : ""}
                  {pct ? `${displayVal}%` : displayVal}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hasAnyStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Before vs After Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                <PolarRadiusAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                <Radar name="Trading Away" dataKey="before" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                <Radar name="Receiving" dataKey="after" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                <Legend wrapperStyle={{ color: "#fff" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Category Changes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9CA3AF" }} />
                <YAxis tick={{ fill: "#9CA3AF" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="change" fill="#F97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-lg border border-orange-500/30">
        <button
          type="button"
          onClick={() => setShowInsights(!showInsights)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-white">Trade Insights</span>
          </div>
          {showInsights ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {showInsights && (
          <div className="px-4 pb-4 space-y-2">
            {generateInsights().map((insight, index) => (
              <div key={index} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-orange-400 mt-1">•</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {otherTargets.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 px-3 py-2.5 overflow-x-auto">
          <div className="flex items-stretch gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-gray-700">
              <div className="w-7 h-7 bg-slate-600 rounded-lg flex items-center justify-center">
                <Crosshair className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0 max-w-[140px] sm:max-w-[11rem]">
                <h3 className="text-sm font-semibold text-white leading-tight whitespace-nowrap truncate">
                  Other players to target
                </h3>
                <p className="text-[11px] text-gray-500 leading-tight whitespace-nowrap">Tap for stats</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 flex-1 min-w-[280px]">
              {otherTargets.map((p) => (
                <button
                  key={p.player_id}
                  type="button"
                  onClick={() => setStatsPlayerId(p.player_id)}
                  className="min-w-0 rounded-lg bg-gray-900/60 border border-gray-600 hover:border-orange-500/60 hover:bg-gray-800/80 px-1.5 py-1.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <div className="text-[11px] text-white truncate font-medium leading-tight">{p.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{p.team ?? "—"}</div>
                  <div className="text-[10px] text-gray-400 tabular-nums mt-0.5 truncate">
                    #{p.rank ?? "—"} · {p.trade_value_score.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {statsRow && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="target-player-stats-title"
          onClick={() => setStatsPlayerId(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-600 bg-gray-900 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-700">
              <div className="min-w-0">
                <h3 id="target-player-stats-title" className="text-lg font-semibold text-white truncate">
                  {statsRow.full_name}
                </h3>
                <p className="text-sm text-gray-400">
                  {[statsRow.team_abbreviation, statsRow.position].filter(Boolean).join(" · ") || "—"}
                  {statsRow.rank != null && ` · Rank #${statsRow.rank}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatsPlayerId(null)}
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {(() => {
                const gp = statsRow.GP || 1;
                const pg = (v: number | undefined) =>
                  v != null && gp > 0 ? (v / gp).toFixed(1) : "—";
                const pct = (v: number | undefined) =>
                  v != null && !Number.isNaN(v) ? `${(v * 100).toFixed(1)}%` : "—";
                const rows: [string, string][] = [
                  ["GP", statsRow.GP != null ? String(statsRow.GP) : "—"],
                  ["MPG", statsRow.MPG != null ? statsRow.MPG.toFixed(1) : "—"],
                  ["FG%", pct(statsRow.FG_PCT)],
                  ["FT%", pct(statsRow.FT_PCT)],
                  ["3PM", pg(statsRow.FG3M)],
                  ["PPG", pg(statsRow.PTS)],
                  ["RPG", pg(statsRow.REB)],
                  ["APG", pg(statsRow.AST)],
                  ["SPG", pg(statsRow.STL)],
                  ["BPG", pg(statsRow.BLK)],
                  ["TOV", pg(statsRow.TOV)],
                ];
                return (
                  <div className="space-y-2">
                    {rows.map(([label, val]) => (
                      <div key={label} className="flex justify-between gap-4 border-b border-gray-800/80 pb-2 last:border-0">
                        <span className="text-gray-500">{label}</span>
                        <span className="text-white tabular-nums">{val}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
