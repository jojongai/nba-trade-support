/**
 * Cache draft simulation + league benchmarks in localStorage so repeated
 * "Continue" / analyze flows skip the network when inputs are unchanged.
 */
import type { DraftSimulateTeam, LeagueBenchmarksApi } from "@/lib/api";
import type { DraftPlayerPayload } from "@/lib/draft-sim";

const STORAGE_KEY = "nba-trade-support/draft-sim-result";

/** Bump when cached `benchmarks` shape changes (e.g. category sorted_values). */
const CACHE_VERSION = 3;

/** True when benchmarks include per-team category samples (required for team analysis). */
export function benchmarksHaveCategoryDistributions(
  benchmarks: LeagueBenchmarksApi | null | undefined
): boolean {
  if (!benchmarks?.categories) return false;
  const pts = benchmarks.categories.PTS;
  return Array.isArray(pts?.sorted_values) && pts.sorted_values.length > 0;
}

export type DraftSimCachePayload = {
  fingerprint: string;
  teams: DraftSimulateTeam[];
  benchmarks: LeagueBenchmarksApi;
};

function stableStringifyRequirements(req: Record<string, number>): Record<string, number> {
  const keys = Object.keys(req).sort();
  const out: Record<string, number> = {};
  for (const k of keys) {
    out[k] = req[k];
  }
  return out;
}

/**
 * Deterministic signature for the draft request body (pool + league shape).
 * If this matches a cached entry, the previous simulation still applies.
 */
export function buildDraftSimulationFingerprint(
  numTeams: number,
  rosterSize: number,
  requirements: Record<string, number>,
  players: DraftPlayerPayload[]
): string {
  const sorted = [...players].sort((a, b) => a.player_id.localeCompare(b.player_id));
  const payload = {
    v: CACHE_VERSION,
    num_teams: numTeams,
    roster_size: rosterSize,
    requirements: stableStringifyRequirements(requirements),
    players: sorted.map((p) => ({
      player_id: p.player_id,
      value: p.value,
      eligible_positions: [...p.eligible_positions].sort(),
    })),
  };
  return JSON.stringify(payload);
}

export function readDraftSimCache(): DraftSimCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Partial<DraftSimCachePayload>;
    if (
      typeof o.fingerprint !== "string" ||
      !Array.isArray(o.teams) ||
      !o.benchmarks ||
      typeof o.benchmarks !== "object"
    ) {
      return null;
    }
    const benchmarks = o.benchmarks as LeagueBenchmarksApi;
    if (!benchmarksHaveCategoryDistributions(benchmarks)) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      return null;
    }
    return {
      fingerprint: o.fingerprint,
      teams: o.teams as DraftSimulateTeam[],
      benchmarks,
    };
  } catch {
    return null;
  }
}

export function writeDraftSimCache(payload: DraftSimCachePayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

export function clearDraftSimCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
