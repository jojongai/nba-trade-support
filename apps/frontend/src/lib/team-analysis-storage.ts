import {
  type TeamAnalysisResponse,
  type TradeTargetsLLMResponse,
  normalizeTopThreeTargets,
} from "@/lib/api";

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
    const llmRaw = o.llm ?? null;
    return {
      teamAnalysis: o.teamAnalysis as TeamAnalysisResponse,
      llm:
        llmRaw && typeof llmRaw === "object"
          ? {
              ...llmRaw,
              top_three_targets: normalizeTopThreeTargets(llmRaw.top_three_targets),
            }
          : null,
    };
  } catch {
    return null;
  }
}
