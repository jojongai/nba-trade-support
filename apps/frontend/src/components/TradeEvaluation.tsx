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
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

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
  const [showLLMContext, setShowLLMContext] = useState(false);
  const [copied, setCopied] = useState(false);

  const leagueSettings = getLeagueSettings();
  const llmContext = buildTradeContextForLLM(tradingAway, receiving, rankings, {
    useSavedWeights: true,
    rosterSlots,
    leagueSettings,
  });
  const llmContextJson = JSON.stringify(llmContext, null, 2);

  const handleCopyLLMContext = async () => {
    try {
      await navigator.clipboard.writeText(llmContextJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = llmContextJson;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">Trade Summary</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
          {[
            { key: "ppg", label: "PPG", value: deltas.ppg, decimals: 1 },
            { key: "rpg", label: "RPG", value: deltas.rpg, decimals: 1 },
            { key: "apg", label: "APG", value: deltas.apg, decimals: 1 },
            { key: "spg", label: "SPG", value: deltas.spg, decimals: 2 },
            { key: "bpg", label: "BPG", value: deltas.bpg, decimals: 2 },
            { key: "fg3m", label: "3PM", value: deltas.fg3m, decimals: 2 },
            { key: "tov", label: "TOV", value: deltas.tov, decimals: 2, inverted: true },
            { key: "fg_pct", label: "FG%", value: deltas.fg_pct, decimals: 1, pct: true },
            { key: "ft_pct", label: "FT%", value: deltas.ft_pct, decimals: 1, pct: true },
          ].map(({ key, label, value, decimals, inverted, pct }) => {
            const displayVal = pct ? (value * 100).toFixed(decimals) : value.toFixed(decimals);
            const colorVal = inverted ? -value : value;
            return (
              <div key={key} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
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

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLLMContext(!showLLMContext)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Copy className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-semibold text-white">Copy for LLM</span>
          </div>
          {showLLMContext ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {showLLMContext && (
          <div className="px-4 pb-4">
            <p className="text-sm text-gray-400 mb-3">
              Compile trade data (players, stats, trade value, graphs) into JSON for AI analysis.
            </p>
            <div className="relative">
              <pre className="p-4 bg-gray-900/80 rounded-lg border border-gray-700 text-xs text-gray-300 overflow-x-auto max-h-80 overflow-y-auto font-mono">
                {llmContextJson}
              </pre>
              <button
                type="button"
                onClick={handleCopyLLMContext}
                className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
