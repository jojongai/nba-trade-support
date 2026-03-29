"use client";

import type { FantasyPlayer } from "@/types/players";
import {
  type LLMTradeResponse,
  SAMPLE_LLM_RESPONSE,
  SAMPLE_REJECT_RESPONSE,
  SAMPLE_NEUTRAL_RESPONSE,
} from "@/lib/llm-response";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { useState } from "react";

export interface TradeAnalysisLLMProps {
  tradingAway: FantasyPlayer[];
  receiving: FantasyPlayer[];
  /** Net trade value (receiving sum minus trading away sum). */
  valueDelta: number;
  ppgDelta: number;
  apgDelta: number;
  /** Parsed API response when analysis succeeded. */
  llmResponse?: LLMTradeResponse | null;
  /** True while the backend is running the model. */
  llmLoading?: boolean;
  /** Set when the API failed or returned invalid JSON. */
  llmError?: string | null;
}

function pickMockResponse(valueDelta: number): LLMTradeResponse {
  if (valueDelta > 10) return SAMPLE_LLM_RESPONSE;
  if (valueDelta < -10) return SAMPLE_REJECT_RESPONSE;
  return SAMPLE_NEUTRAL_RESPONSE;
}

export function TradeAnalysisLLM({
  tradingAway,
  receiving,
  valueDelta,
  ppgDelta,
  apgDelta,
  llmResponse = null,
  llmLoading = false,
  llmError = null,
}: TradeAnalysisLLMProps) {
  const [showDetailedInsights, setShowDetailedInsights] = useState(false);

  if (tradingAway.length === 0 || receiving.length === 0) {
    return null;
  }

  if (llmLoading) {
    return (
      <div className="mb-6">
        <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-xl border border-orange-500/50 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Analyzing trade…</h3>
            <p className="text-gray-400 text-sm text-center max-w-md">
              Sending your trade context to the model and building structured analysis.
            </p>
            <div className="mt-4 flex gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (llmError) {
    return (
      <div className="mb-6">
        <div className="bg-red-500/10 rounded-xl border border-red-500/40 p-6 flex gap-4">
          <AlertCircle className="w-8 h-8 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Analysis unavailable</h3>
            <p className="text-sm text-gray-300">{llmError}</p>
            <p className="text-xs text-gray-500 mt-2">
              Check that the backend is running, <code className="text-gray-400">OPENAI_API_KEY</code> is set,
              and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const response: LLMTradeResponse = llmResponse ?? pickMockResponse(valueDelta);

  const getVerdictConfig = (verdict: string) => {
    switch (verdict) {
      case "accept":
        return {
          icon: ThumbsUp,
          color: "text-green-400",
          bgColor: "from-green-500/20 via-green-600/10",
          borderColor: "border-green-500/30",
          label: "Recommended: Accept trade",
        };
      case "reject":
        return {
          icon: ThumbsDown,
          color: "text-red-400",
          bgColor: "from-red-500/20 via-red-600/10",
          borderColor: "border-red-500/30",
          label: "Not recommended: Reject trade",
        };
      default:
        return {
          icon: Minus,
          color: "text-yellow-400",
          bgColor: "from-yellow-500/20 via-yellow-600/10",
          borderColor: "border-yellow-500/30",
          label: "Neutral: Your call",
        };
    }
  };

  const verdictConfig = getVerdictConfig(response.verdict);
  const VerdictIcon = verdictConfig.icon;

  return (
    <div className="mb-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">AI trade analysis</h2>
          <p className="text-sm text-gray-400 mt-1">
            Structured verdict, pros/cons, and insights from your trade context.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors opacity-80 cursor-not-allowed"
          disabled
          title="Export coming soon"
        >
          <ExternalLink className="w-4 h-4" />
          Export report
        </button>
      </div>

      <div
        className={`bg-gradient-to-br ${verdictConfig.bgColor} to-transparent rounded-xl border-2 ${verdictConfig.borderColor} p-6 sm:p-8 relative overflow-hidden`}
      >
        <div
          className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br ${verdictConfig.bgColor} rounded-full blur-3xl opacity-60`}
          aria-hidden
        />

        <div className="relative">
          <div className="flex items-start gap-4 mb-6">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                response.verdict === "accept"
                  ? "bg-green-500"
                  : response.verdict === "reject"
                    ? "bg-red-500"
                    : "bg-yellow-500"
              }`}
            >
              <VerdictIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-xl sm:text-2xl font-bold ${verdictConfig.color} mb-2`}>
                {verdictConfig.label}
              </h3>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-sm text-gray-400">Confidence score</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        response.verdict_score >= 70
                          ? "bg-green-500"
                          : response.verdict_score >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, response.verdict_score))}%` }}
                    />
                  </div>
                  <span
                    className={`font-semibold tabular-nums ${
                      response.verdict_score >= 70
                        ? "text-green-400"
                        : response.verdict_score >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {response.verdict_score}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-5 sm:p-6 backdrop-blur-sm border border-gray-700/50 mb-6">
            <p className="text-gray-200 leading-relaxed text-base">{response.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900/50 rounded-lg p-5 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <h4 className="font-semibold text-white">Pros</h4>
              </div>
              <ul className="space-y-2">
                {response.pros.map((pro, index) => (
                  <li
                    key={index}
                    className="flex items-baseline gap-2.5 text-sm leading-relaxed text-gray-300"
                  >
                    <span className="shrink-0 select-none text-green-400" aria-hidden>
                      +
                    </span>
                    <span className="min-w-0 flex-1">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-5 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <h4 className="font-semibold text-white">Cons</h4>
              </div>
              <ul className="space-y-2">
                {response.cons.map((con, index) => (
                  <li
                    key={index}
                    className="flex items-baseline gap-2.5 text-sm leading-relaxed text-gray-300"
                  >
                    <span className="shrink-0 select-none text-red-400" aria-hidden>
                      −
                    </span>
                    <span className="min-w-0 flex-1">{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Value change (net)</div>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  valueDelta > 0 ? "text-green-400" : valueDelta < 0 ? "text-red-400" : "text-gray-400"
                }`}
              >
                {valueDelta > 0 ? "+" : ""}
                {valueDelta.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">PPG impact</div>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  ppgDelta > 0 ? "text-green-400" : ppgDelta < 0 ? "text-red-400" : "text-gray-400"
                }`}
              >
                {ppgDelta > 0 ? "+" : ""}
                {ppgDelta.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">APG impact</div>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  apgDelta > 0 ? "text-green-400" : apgDelta < 0 ? "text-red-400" : "text-gray-400"
                }`}
              >
                {apgDelta > 0 ? "+" : ""}
                {apgDelta.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <button
          type="button"
          onClick={() => setShowDetailedInsights(!showDetailedInsights)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-800/80 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-5 h-5 text-orange-400 shrink-0" />
            <span className="font-semibold text-white">AI insights</span>
            <span className="text-sm text-gray-400">({response.insights.length} items)</span>
          </div>
          {showDetailedInsights ? (
            <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
          )}
        </button>

        {showDetailedInsights && (
          <div className="px-4 pb-4 space-y-2">
            {response.insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-baseline gap-2.5 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30"
              >
                <span
                  className="text-blue-400 shrink-0 text-sm leading-relaxed select-none"
                  aria-hidden
                >
                  •
                </span>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-200">{insight}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
