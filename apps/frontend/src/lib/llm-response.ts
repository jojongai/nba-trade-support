/**
 * Expected schema for LLM trade analysis response.
 * Use SAMPLE_LLM_RESPONSE for UI testing without spending tokens.
 */

export type TradeVerdict = "accept" | "reject" | "neutral";

export interface LLMTradeResponse {
  verdict: TradeVerdict;
  verdict_score: number;
  summary: string;
  pros: string[];
  cons: string[];
  recommendation: string;
  insights: string[];
  category_impacts?: Record<string, string>;
}

/** Type guard for LLM response parsing. */
export function isLLMTradeResponse(obj: unknown): obj is LLMTradeResponse {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (!["accept", "reject", "neutral"].includes(String(o.verdict ?? ""))) return false;
  if (typeof o.verdict_score !== "number") return false;
  if (typeof o.summary !== "string") return false;
  if (!Array.isArray(o.pros) || !o.pros.every((p) => typeof p === "string")) return false;
  if (!Array.isArray(o.cons) || !o.cons.every((c) => typeof c === "string")) return false;
  if (typeof o.recommendation !== "string") return false;
  if (!Array.isArray(o.insights) || !o.insights.every((i) => typeof i === "string")) return false;
  return true;
}

/**
 * Sample LLM response for UI testing without API calls.
 * Simulates what the backend would return for a typical trade analysis.
 */
import sampleJson from "./sample-llm-response.json";

export const SAMPLE_LLM_RESPONSE: LLMTradeResponse = sampleJson as LLMTradeResponse;
