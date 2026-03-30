import type { TeamAnalysisResponse, TradeTargetsLLMResponse } from "@/lib/api";

export const TEAM_ANALYSIS_RESULTS_STORAGE_KEY = "nba-trade-support/team-analysis-results";

export type TeamAnalysisResultsPayload = {
  teamAnalysis: TeamAnalysisResponse;
  llm: TradeTargetsLLMResponse | null;
};

export function saveTeamAnalysisResultsPayload(data: TeamAnalysisResultsPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TEAM_ANALYSIS_RESULTS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function loadTeamAnalysisResultsPayload(): TeamAnalysisResultsPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TEAM_ANALYSIS_RESULTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Partial<TeamAnalysisResultsPayload>;
    if (!o.teamAnalysis || typeof o.teamAnalysis !== "object") return null;
    return {
      teamAnalysis: o.teamAnalysis as TeamAnalysisResponse,
      llm: o.llm ?? null,
    };
  } catch {
    return null;
  }
}
