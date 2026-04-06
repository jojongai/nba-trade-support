"use client";

import { useState } from "react";
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
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { TeamAnalysisResponse, TradeTargetsLLMResponse } from "@/lib/api";

const STAT_CATEGORIES = [
  "PTS",
  "REB",
  "AST",
  "3PM",
  "STL",
  "BLK",
  "TOV",
  "FG%",
  "FT%",
] as const;

const RADAR_LABEL: Record<string, string> = {
  PTS: "PTS",
  REB: "REB",
  AST: "AST",
  "3PM": "3PM",
  STL: "STL",
  BLK: "BLK",
  TOV: "TOV",
  "FG%": "FG%",
  "FT%": "FT%",
};

function getProfileTotals(profile: TeamAnalysisResponse["profile"]): Record<string, number> {
  const raw = profile.category_totals;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const k of STAT_CATEGORIES) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

function getRatingColor(percentile: number) {
  if (percentile >= 70) return "text-green-400";
  if (percentile >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getRatingLabel(percentile: number) {
  if (percentile >= 85) return "Elite";
  if (percentile >= 70) return "Strong";
  if (percentile >= 60) return "Above average";
  if (percentile >= 50) return "Average";
  if (percentile >= 40) return "Below average";
  return "Needs work";
}

export interface TeamAnalysisResultsProps {
  teamAnalysis: TeamAnalysisResponse;
  llm: TradeTargetsLLMResponse | null;
}

export function TeamAnalysisResults({ teamAnalysis, llm }: TeamAnalysisResultsProps) {
  const [showDetailedInsights, setShowDetailedInsights] = useState(false);

  const { profile, league_comparison: lc } = teamAnalysis;
  const overallPct = lc.overall.percentile_estimate;
  const totals = getProfileTotals(profile);
  const overallScore =
    typeof profile.overall_score === "number" ? profile.overall_score : lc.overall.team_score;

  const radarData = STAT_CATEGORIES.map((key) => {
    const cat = lc.categories[key];
    const pct = cat ? cat.percentile_estimate : 50;
    return {
      category: RADAR_LABEL[key] ?? key,
      team: pct,
      leagueMedian: 50,
    };
  });

  const barData = STAT_CATEGORIES.map((key) => {
    const cat = lc.categories[key];
    const dev = cat ? cat.percentile_estimate - 50 : 0;
    return {
      name: RADAR_LABEL[key] ?? key,
      value: dev,
      color: dev >= 0 ? "#10B981" : "#EF4444",
    };
  });

  const quick = [
    {
      label: "PTS (proj. total)",
      total: totals.PTS ?? 0,
      percentile: lc.categories.PTS?.percentile_estimate ?? 50,
    },
    {
      label: "REB (proj. total)",
      total: totals.REB ?? 0,
      percentile: lc.categories.REB?.percentile_estimate ?? 50,
    },
    {
      label: "AST (proj. total)",
      total: totals.AST ?? 0,
      percentile: lc.categories.AST?.percentile_estimate ?? 50,
    },
    {
      label: "Trade value (sum)",
      total: overallScore,
      percentile: overallPct,
      isValue: true,
    },
  ];

  const llmInsightCards: Array<{ type: "strength" | "weakness" | "warning"; text: string }> =
    [];

  if (llm) {
    for (const t of llm.strengths) {
      llmInsightCards.push({ type: "strength", text: t });
    }
    for (const t of llm.weaknesses) {
      llmInsightCards.push({ type: "weakness", text: t });
    }
    for (const t of llm.insights) {
      llmInsightCards.push({ type: "warning", text: t });
    }
  }

  return (
    <div className="mt-8 space-y-6 max-w-6xl mx-auto px-4 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Team analysis results</h1>
          <p className="text-sm text-gray-400 mt-1">
            {llm?.team_identity ?? "Synthetic league comparison"} · from your last run on Trade
            Analyzer
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">League percentile (overall)</div>
          <div className={`text-4xl font-bold tabular-nums ${getRatingColor(overallPct)}`}>
            {overallPct.toFixed(0)}
          </div>
          <div className="text-sm text-gray-400">{getRatingLabel(overallPct)}</div>
        </div>
      </div>

      {llm?.narrative_summary && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-sm text-gray-300">
          {llm.narrative_summary}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quick.map((row) => {
          const dev = row.percentile - 50;
          const up = dev >= 0;
          return (
            <div
              key={row.label}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            >
              <div className="text-xs text-gray-400 mb-1">{row.label}</div>
              <div className="text-2xl font-bold text-white tabular-nums">
                {row.isValue ? row.total.toFixed(1) : row.total.toFixed(0)}
              </div>
              <div
                className={`text-sm flex items-center gap-1 mt-1 ${
                  up ? "text-green-400" : "text-red-400"
                }`}
              >
                {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {up ? "+" : ""}
                {dev.toFixed(0)} pts vs median
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">
            Category percentiles vs league median
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Radar: your percentile (0–100) vs 50 (synthetic league median team).
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="category" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
              <Radar
                name="League median"
                dataKey="leagueMedian"
                stroke="#6B7280"
                fill="#6B7280"
                fillOpacity={0.25}
              />
              <Radar
                name="Your team"
                dataKey="team"
                stroke="#F97316"
                fill="#F97316"
                fillOpacity={0.45}
              />
              <Legend wrapperStyle={{ color: "#fff" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">
            Category tilt (percentile − 50)
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9CA3AF" }} domain={[-50, 50]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-lg border border-orange-500/30">
        <button
          type="button"
          onClick={() => setShowDetailedInsights(!showDetailedInsights)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-white">AI &amp; diagnosis</span>
              <p className="text-sm text-gray-400">
                {llm
                  ? `${llmInsightCards.length} LLM items · ${teamAnalysis.flags.length} flags`
                  : `${teamAnalysis.flags.length} deterministic flags — run LLM on Trade Analyzer for narrative`}
              </p>
            </div>
          </div>
          {showDetailedInsights ? (
            <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
          )}
        </button>

        {showDetailedInsights && (
          <div className="px-4 pb-4 space-y-3">
            {teamAnalysis.flags.map((f) => (
              <div
                key={f}
                className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
              >
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white">{f}</p>
              </div>
            ))}
            {llmInsightCards.map((insight, index) => (
              <div
                key={`${insight.type}-${index}`}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  insight.type === "strength"
                    ? "bg-green-500/10 border border-green-500/30"
                    : insight.type === "weakness"
                      ? "bg-red-500/10 border border-red-500/30"
                      : "bg-amber-500/10 border border-amber-500/30"
                }`}
              >
                {insight.type === "strength" && (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                )}
                {insight.type === "weakness" && (
                  <Target className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                {insight.type === "warning" && (
                  <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm text-white">{insight.text}</p>
              </div>
            ))}
            {!llm && teamAnalysis.flags.length === 0 && (
              <p className="text-sm text-gray-400">
                No extra insights yet. Run team analysis and the LLM step on the Trade Analyzer
                page.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-500/10 rounded-lg p-6 border border-blue-500/30">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          Recommendations
        </h2>
        <ul className="space-y-2 text-sm text-gray-300 list-disc list-outside pl-5 [&>li]:marker:text-blue-400">
          {llm?.top_improvements.map((t, i) => (
            <li key={`imp-${i}-${t}`} className="leading-relaxed ps-1">
              {t}
            </li>
          ))}
          {llm?.recommended_move_types.map((t, i) => (
            <li key={`move-${i}-${t}`} className="leading-relaxed ps-1">
              {t}
            </li>
          ))}
          {teamAnalysis.candidate_actions.map((t) => (
            <li key={t} className="leading-relaxed ps-1 marker:text-gray-500">
              {t}
            </li>
          ))}
          {teamAnalysis.trade_targets?.needs?.length ? (
            <li className="leading-relaxed ps-1 marker:text-emerald-400">
              <span className="text-gray-500">Needs: </span>
              {teamAnalysis.trade_targets.needs.join(", ")}
            </li>
          ) : null}
          {!llm &&
            teamAnalysis.candidate_actions.length === 0 &&
            !(teamAnalysis.trade_targets?.needs?.length) && (
              <li className="leading-relaxed ps-1">
                Run the LLM step on Trade Analyzer for prioritized move ideas.
              </li>
            )}
        </ul>
      </div>

      {llm && llm.top_three_targets.length > 0 && (
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4 text-sm text-gray-300">
          <h2 className="text-white font-medium mb-2">Top trade targets (LLM)</h2>
          <p className="text-gray-400 mb-3">{llm.summary}</p>
          <ol className="list-decimal list-outside pl-5 space-y-2 [&>li]:marker:text-emerald-400/90">
            {llm.top_three_targets.map((t) => (
              <li key={`${t.rank}-${t.name}`} className="pl-1 leading-relaxed">
                <span className="text-white font-medium">{t.name}</span>
                <p className="text-gray-400 text-xs mt-0.5">{t.why_fit}</p>
                <p className="text-gray-500 text-xs mt-0.5">{t.trade_construction}</p>
              </li>
            ))}
          </ol>
          <p className="text-xs text-gray-500 mt-3">{llm.constraint_acknowledgment}</p>
        </div>
      )}

      {!llm?.top_three_targets?.length &&
        (teamAnalysis.trade_targets?.candidates?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4 text-sm text-gray-300">
            <h2 className="text-white font-medium mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400 shrink-0" />
              Players to target
            </h2>
            <p className="text-gray-400 text-xs mb-3">
              {llm
                ? "LLM did not return ranked targets; showing deterministic candidates instead."
                : "Ranked by fit for your build (deterministic). If the LLM step failed (e.g. missing API key), you still get these picks."}
            </p>
            <ol className="list-decimal list-outside pl-5 space-y-3 [&>li]:marker:text-emerald-400/90">
              {(teamAnalysis.trade_targets?.candidates ?? []).slice(0, 12).map((c) => (
                <li key={c.player_id} className="pl-1 leading-relaxed">
                  <span className="text-white font-medium">{c.name}</span>
                  <span className="text-gray-500 text-xs ml-2">
                    {c.position}
                    {c.team ? ` · ${c.team}` : ""}
                  </span>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Fit {c.fit_score.toFixed(2)} · value {c.trade_value.toFixed(1)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}

      {!llm?.top_three_targets?.length &&
        teamAnalysis.trade_targets &&
        teamAnalysis.trade_targets.candidates.length === 0 &&
        teamAnalysis.trade_targets.summary_for_prompt?.note && (
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-100/90">
            {teamAnalysis.trade_targets.summary_for_prompt.note}
          </div>
        )}
    </div>
  );
}
