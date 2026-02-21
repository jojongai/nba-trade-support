"use client";

import type { FantasyPlayer } from "@/types/players";
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
} from "lucide-react";
import { useState } from "react";

interface TradeEvaluationProps {
  tradingAway: FantasyPlayer[];
  receiving: FantasyPlayer[];
}

function sum(arr: FantasyPlayer[], key: keyof FantasyPlayer): number {
  return arr.reduce((acc, p) => {
    const v = p[key];
    return acc + (typeof v === "number" ? v : 0);
  }, 0);
}

export function TradeEvaluation({
  tradingAway,
  receiving,
}: TradeEvaluationProps) {
  const [showInsights, setShowInsights] = useState(false);

  if (tradingAway.length === 0 || receiving.length === 0) {
    return null;
  }

  const awayPpg = sum(tradingAway, "ppg");
  const awayRpg = sum(tradingAway, "rpg");
  const awayApg = sum(tradingAway, "apg");
  const awayValue = sum(tradingAway, "tradeValue");
  const awayVol =
    tradingAway.length > 0
      ? tradingAway.reduce((a, p) => a + (p.volatility ?? 0), 0) /
        tradingAway.length
      : 0;

  const recvPpg = sum(receiving, "ppg");
  const recvRpg = sum(receiving, "rpg");
  const recvApg = sum(receiving, "apg");
  const recvValue = sum(receiving, "tradeValue");
  const recvVol =
    receiving.length > 0
      ? receiving.reduce((a, p) => a + (p.volatility ?? 0), 0) / receiving.length
      : 0;

  const differences = {
    ppg: recvPpg - awayPpg,
    rpg: recvRpg - awayRpg,
    apg: recvApg - awayApg,
    value: recvValue - awayValue,
    volatility: recvVol - awayVol,
  };

  const hasAnyStats =
    awayPpg > 0 ||
    awayRpg > 0 ||
    awayApg > 0 ||
    recvPpg > 0 ||
    recvRpg > 0 ||
    recvApg > 0;

  const fairnessScore = hasAnyStats
    ? Math.max(
        0,
        Math.min(100, 100 - Math.abs(differences.value) * 2)
      )
    : null;

  const radarData = [
    { category: "Points", before: awayPpg, after: recvPpg },
    { category: "Rebounds", before: awayRpg, after: recvRpg },
    { category: "Assists", before: awayApg, after: recvApg },
    { category: "Value", before: awayValue, after: recvValue },
  ];

  const barData = [
    { name: "PPG", change: differences.ppg },
    { name: "RPG", change: differences.rpg },
    { name: "APG", change: differences.apg },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

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
    if (differences.ppg > 5) insights.push("This trade significantly improves your scoring.");
    else if (differences.ppg < -5) insights.push("This trade weakens your scoring depth.");
    if (differences.apg > 3) insights.push("Your assist production will increase substantially.");
    else if (differences.apg < -3) insights.push("Consider your playmaking needs — this trade reduces assists.");
    if (differences.rpg > 3) insights.push("Rebounding gets a boost with this trade.");
    else if (differences.rpg < -3) insights.push("This trade weakens rebounding depth.");
    if (differences.volatility > 10) insights.push("⚠️ Injury risk increases with this trade.");
    else if (differences.volatility < -10) insights.push("✅ This trade reduces your injury risk exposure.");
    if (fairnessScore != null && fairnessScore < 60) insights.push("⚠️ This trade may not be fair value. Consider negotiating.");
    if (insights.length === 0) insights.push("This appears to be a relatively balanced trade.");
    return insights;
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">Trade Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Fairness Score</div>
            {fairnessScore != null ? (
              <div className={`text-3xl font-bold ${getScoreColor(fairnessScore)}`}>
                {fairnessScore.toFixed(0)}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">N/A</div>
            )}
            <div className="text-xs text-gray-500 mt-1">out of 100</div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">PPG Change</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getChangeColor(differences.ppg)}`}>
              {getChangeIndicator(differences.ppg)}
              {differences.ppg > 0 ? "+" : ""}
              {differences.ppg.toFixed(1)}
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">RPG Change</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getChangeColor(differences.rpg)}`}>
              {getChangeIndicator(differences.rpg)}
              {differences.rpg > 0 ? "+" : ""}
              {differences.rpg.toFixed(1)}
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">APG Change</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getChangeColor(differences.apg)}`}>
              {getChangeIndicator(differences.apg)}
              {differences.apg > 0 ? "+" : ""}
              {differences.apg.toFixed(1)}
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Injury Risk Δ</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getChangeColor(-differences.volatility)}`}>
              {getChangeIndicator(-differences.volatility)}
              {differences.volatility > 0 ? "+" : ""}
              {differences.volatility.toFixed(0)}%
            </div>
          </div>
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
    </div>
  );
}
