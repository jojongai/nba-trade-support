"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Search, X, RefreshCw, UserPlus, BarChart3, Info } from "lucide-react";
import { getLeagueSettings, DEFAULT_ROSTER_SETTINGS, type RosterSettings } from "@/lib/league-settings";
import {
  fetchRankings,
  fetchTeams,
  fetchTradeAnalysis,
  fetchDraftSimulate,
  type DraftSimulateTeam,
  type RankingRow,
  type Team,
} from "@/lib/api";
import {
  buildDraftPlayerPoolFromRankings,
  DEFAULT_DRAFT_POSITION_MINS,
} from "@/lib/draft-sim";
import { buildTradeContextForLLM } from "@/lib/trade-context";
import { isLLMTradeResponse, type LLMTradeResponse } from "@/lib/llm-response";
import { computeTradeValues } from "@/lib/trade-value";
import type { FantasyPlayer } from "@/types/players";
import { PlayerCard } from "@/components/PlayerCard";
import dynamic from "next/dynamic";

const TradeEvaluation = dynamic(
  () => import("@/components/TradeEvaluation").then((m) => ({ default: m.TradeEvaluation })),
  { ssr: false }
);

type RosterSlotLabel = "PG" | "SG" | "SF" | "PF" | "C" | "G" | "F" | "UTIL" | "BENCH" | "IL";

interface RosterPosition {
  position: RosterSlotLabel;
  player: FantasyPlayer | null;
  eligiblePositions: string[];
}

const POSITION_ELIGIBLE: Record<RosterSlotLabel, string[]> = {
  PG: ["PG"],
  SG: ["SG"],
  SF: ["SF"],
  PF: ["PF"],
  C: ["C"],
  G: ["PG", "SG"],
  F: ["SF", "PF"],
  UTIL: ["PG", "SG", "SF", "PF", "C"],
  BENCH: ["PG", "SG", "SF", "PF", "C"],
  IL: ["PG", "SG", "SF", "PF", "C"],
};

const ROSTER_KEYS: (keyof RosterSettings)[] = [
  "pg", "sg", "sf", "pf", "c", "g", "f", "util", "bench",
];

const KEY_TO_SLOT_LABEL: Record<keyof RosterSettings, RosterSlotLabel> = {
  pg: "PG",
  sg: "SG",
  sf: "SF",
  pf: "PF",
  c: "C",
  g: "G",
  f: "F",
  util: "UTIL",
  bench: "BENCH",
};

function buildRosterSlots(rosterSettings: RosterSettings): RosterPosition[] {
  const slots: RosterPosition[] = [];
  for (const key of ROSTER_KEYS) {
    const label = KEY_TO_SLOT_LABEL[key];
    const count = Math.max(0, Number(rosterSettings[key]) || 0);
    const eligible = POSITION_ELIGIBLE[label];
    for (let i = 0; i < count; i++) {
      slots.push({ position: label, player: null, eligiblePositions: eligible });
    }
  }
  return slots;
}

function rankingRowToFantasyPlayer(
  row: RankingRow,
  tradeValueMap: Map<number, number>
): FantasyPlayer {
  const tradeValue = tradeValueMap.get(row.player_id);
  return {
    id: String(row.player_id),
    name: row.full_name,
    team: row.team_abbreviation,
    position: row.position,
    fantasRank: row.rank,
    ppg: row.PTS != null && (row.GP ?? 0) > 0 ? Math.round((row.PTS / row.GP!) * 10) / 10 : undefined,
    rpg: row.REB != null && (row.GP ?? 0) > 0 ? Math.round((row.REB / row.GP!) * 10) / 10 : undefined,
    apg: row.AST != null && (row.GP ?? 0) > 0 ? Math.round((row.AST / row.GP!) * 10) / 10 : undefined,
    tradeValue: tradeValue != null ? Math.round(tradeValue * 100) / 100 : undefined,
  };
}

/** API returns G, F, C, G-F, F-C, etc. Map to fantasy positions (PG, SG, SF, PF, C) for slot eligibility. */
const API_POSITION_TO_FANTASY: Record<string, string[]> = {
  G: ["PG", "SG"],
  F: ["SF", "PF"],
  C: ["C"],
  "G-F": ["PG", "SG", "SF", "PF"],
  "F-G": ["PG", "SG", "SF", "PF"],
  "F-C": ["SF", "PF", "C"],
  "C-F": ["SF", "PF", "C"],
};
const ALL_FANTASY_POSITIONS = ["PG", "SG", "SF", "PF", "C"];

function getFantasyPositionsForApiPosition(apiPosition: string | undefined): string[] {
  const key = (apiPosition || "").trim();
  if (!key || key === "—") return ALL_FANTASY_POSITIONS; // unknown/missing -> eligible everywhere
  const mapped = API_POSITION_TO_FANTASY[key];
  return mapped ?? ALL_FANTASY_POSITIONS;
}

const TRADE_ANALYZER_STORAGE_KEY = "nba-trade-support/trade-analyzer-state";

function getTradeAnalyzerState(): {
  roster: (FantasyPlayer | null)[];
  tradingAway: FantasyPlayer[];
  receiving: FantasyPlayer[];
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TRADE_ANALYZER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as { roster?: unknown[]; tradingAway?: unknown[]; receiving?: unknown[] };
    return {
      roster: Array.isArray(o.roster) ? (o.roster as (FantasyPlayer | null)[]) : [],
      tradingAway: Array.isArray(o.tradingAway) ? (o.tradingAway as FantasyPlayer[]) : [],
      receiving: Array.isArray(o.receiving) ? (o.receiving as FantasyPlayer[]) : [],
    };
  } catch {
    return null;
  }
}

function setTradeAnalyzerState(state: {
  roster: (FantasyPlayer | null)[];
  tradingAway: FantasyPlayer[];
  receiving: FantasyPlayer[];
}): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRADE_ANALYZER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export default function TradeAnalyzerPage() {
  const [rosterSlots, setRosterSlots] = useState<RosterPosition[]>(() =>
    buildRosterSlots(DEFAULT_ROSTER_SETTINGS)
  );
  const [tradingAway, setTradingAway] = useState<FantasyPlayer[]>([]);
  const [receiving, setReceiving] = useState<FantasyPlayer[]>([]);
  const [searchingSlotIndex, setSearchingSlotIndex] = useState<number | null>(null);
  const [slotSearchQuery, setSlotSearchQuery] = useState("");
  const [receiveSearchQuery, setReceiveSearchQuery] = useState("");
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [rankingsError, setRankingsError] = useState<string | null>(null);
  const [analysisRequested, setAnalysisRequested] = useState(false);
  const [llmAnalysis, setLlmAnalysis] = useState<LLMTradeResponse | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [showRosterIncompleteToast, setShowRosterIncompleteToast] = useState(false);
  const [showLeagueSettingsConfirmModal, setShowLeagueSettingsConfirmModal] =
    useState(false);
  const [draftSimLoading, setDraftSimLoading] = useState(false);
  const [draftSimError, setDraftSimError] = useState<string | null>(null);
  const [draftSimTeams, setDraftSimTeams] = useState<DraftSimulateTeam[] | null>(null);
  const hasHydratedRef = useRef(false);
  const skipFirstPersistRef = useRef(true);
  const tradeSummaryRef = useRef<HTMLDivElement>(null);

  // Same filter logic as rankings table: name substring (trim, case-insensitive), optional position and team exact match.
  // When positionAllowList is set (slot search), API positions (G, F, C, G-F, etc.) are mapped to fantasy positions (PG, SG, SF, PF, C).
  const filterPlayersBySearch = useMemo(() => {
    return (
      players: FantasyPlayer[],
      searchQuery: string,
      positionFilter: string,
      teamFilter: string,
      positionAllowList?: string[] // when set, player's API position must map to at least one of these fantasy positions (for slot)
    ): FantasyPlayer[] => {
      return players.filter((player) => {
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          if (!(player.name || "").toLowerCase().includes(q)) return false;
        }
        if (positionFilter) {
          if (ALL_FANTASY_POSITIONS.includes(positionFilter)) {
            const playerFantasy = getFantasyPositionsForApiPosition(player.position);
            if (!playerFantasy.includes(positionFilter)) return false;
          } else {
            if ((player.position || "").trim() !== positionFilter) return false;
          }
        }
        if (positionAllowList && positionAllowList.length > 0) {
          const playerFantasyPositions = getFantasyPositionsForApiPosition(player.position);
          const eligible = positionAllowList.some((p) => playerFantasyPositions.includes(p));
          if (!eligible) return false;
        }
        if (teamFilter) {
          if ((player.team || "").trim() !== teamFilter) return false;
        }
        return true;
      });
    };
  }, []);

  // Load roster settings and saved trade state on mount
  useEffect(() => {
    const saved = getLeagueSettings();
    const rs = saved?.rosterSettings && typeof saved.rosterSettings === "object"
      ? { ...DEFAULT_ROSTER_SETTINGS, ...saved.rosterSettings }
      : DEFAULT_ROSTER_SETTINGS;
    const slots = buildRosterSlots(rs);
    const savedTrade = getTradeAnalyzerState();
    if (savedTrade && Array.isArray(savedTrade.roster)) {
      for (let i = 0; i < slots.length && i < savedTrade.roster.length; i++) {
        const p = savedTrade.roster[i];
        slots[i].player = p && typeof p === "object" && p !== null && "id" in p && "name" in p ? (p as FantasyPlayer) : null;
      }
      // Extra saved entries = IL spots
      for (let i = slots.length; i < savedTrade.roster.length; i++) {
        const p = savedTrade.roster[i];
        slots.push({
          position: "IL",
          player: p && typeof p === "object" && p !== null && "id" in p && "name" in p ? (p as FantasyPlayer) : null,
          eligiblePositions: ["PG", "SG", "SF", "PF", "C"],
        });
      }
      setRosterSlots(slots);
      setTradingAway(Array.isArray(savedTrade.tradingAway) ? (savedTrade.tradingAway as FantasyPlayer[]) : []);
      setReceiving(Array.isArray(savedTrade.receiving) ? (savedTrade.receiving as FantasyPlayer[]) : []);
    } else {
      setRosterSlots(slots);
    }
    hasHydratedRef.current = true;
  }, []);

  // Persist to localStorage whenever roster, trading away, or receiving changes (after initial load).
  // Skip first run to avoid overwriting saved data with initial state before hydration.
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (skipFirstPersistRef.current) {
      skipFirstPersistRef.current = false;
      return;
    }
    setTradeAnalyzerState({
      roster: rosterSlots.map((s) => s.player),
      tradingAway,
      receiving,
    });
  }, [rosterSlots, tradingAway, receiving]);

  // Clear analysis when trade changes (user adds/removes players)
  useEffect(() => {
    setAnalysisRequested(false);
    setLlmAnalysis(null);
    setLlmError(null);
    setLlmLoading(false);
  }, [tradingAway, receiving]);

  useEffect(() => {
    if (!showRosterIncompleteToast) return;
    const t = window.setTimeout(() => setShowRosterIncompleteToast(false), 6500);
    return () => window.clearTimeout(t);
  }, [showRosterIncompleteToast]);

  useEffect(() => {
    if (!showLeagueSettingsConfirmModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLeagueSettingsConfirmModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLeagueSettingsConfirmModal]);

  // Scroll to trade summary when analysis is requested
  useEffect(() => {
    if (analysisRequested && tradeSummaryRef.current) {
      requestAnimationFrame(() => {
        tradeSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [analysisRequested]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRankings(), fetchTeams()])
      .then(([rankingsData, teamsData]) => {
        if (!cancelled) {
          setRankings(rankingsData);
          setTeams(teamsData);
        }
      })
      .catch(() => {
        if (!cancelled) setRankingsError("Failed to load players. Is the backend running?");
      })
      .finally(() => {
        if (!cancelled) setRankingsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const tradeValueMap = useMemo(
    () => computeTradeValues(rankings, { useSavedWeights: true }),
    [rankings]
  );

  const handleContinueAnalyzeTeam = async () => {
    setShowLeagueSettingsConfirmModal(false);
    setDraftSimError(null);
    setDraftSimLoading(true);
    try {
      const settings = getLeagueSettings();
      const numTeams = settings?.teamsInLeague ?? 12;
      if (numTeams < 2 || numTeams > 36) {
        setDraftSimError("Set the number of teams in League Settings (2–36).");
        return;
      }
      const rosterSize = 12;
      const minPool = numTeams * rosterSize;
      const players = buildDraftPlayerPoolFromRankings(rankings, tradeValueMap);
      if (players.length < minPool) {
        setDraftSimError(
          `Need at least ${minPool} ranked players in the pool; only ${players.length} available.`
        );
        return;
      }
      const { teams } = await fetchDraftSimulate({
        num_teams: numTeams,
        roster_size: rosterSize,
        requirements: DEFAULT_DRAFT_POSITION_MINS,
        players,
      });
      setDraftSimTeams(teams);
      requestAnimationFrame(() => {
        document.getElementById("draft-simulation")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (e) {
      setDraftSimError(e instanceof Error ? e.message : "Draft simulation failed.");
      setDraftSimTeams(null);
    } finally {
      setDraftSimLoading(false);
    }
  };

  const allPlayers = useMemo(
    () => rankings.map((row) => rankingRowToFantasyPlayer(row, tradeValueMap)),
    [rankings, tradeValueMap]
  );

  const rosterPlayers = useMemo(
    () => rosterSlots.map((s) => s.player).filter(Boolean) as FantasyPlayer[],
    [rosterSlots]
  );

  const getFilteredPlayersForSlot = (slotIndex: number) => {
    if (searchingSlotIndex !== slotIndex) return [];
    const slot = rosterSlots[slotIndex];
    const filtered = filterPlayersBySearch(
      allPlayers,
      slotSearchQuery,
      "",
      "",
      slot.eligiblePositions
    );
    return filtered.filter((p) => !rosterPlayers.some((r) => r.id === p.id));
  };

  const filteredReceivePlayers = useMemo(() => {
    const filtered = filterPlayersBySearch(allPlayers, receiveSearchQuery, "", "");
    return filtered.filter(
      (p) =>
        !rosterPlayers.some((r) => r.id === p.id) &&
        !receiving.some((r) => r.id === p.id)
    );
  }, [allPlayers, rosterPlayers, receiving, receiveSearchQuery, filterPlayersBySearch]);

  const addPlayerToSlot = (slotIndex: number, player: FantasyPlayer) => {
    setRosterSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = { ...next[slotIndex], player };
      return next;
    });
    setSearchingSlotIndex(null);
    setSlotSearchQuery("");
  };

  const removePlayerFromSlot = (slotIndex: number) => {
    const removed = rosterSlots[slotIndex].player;
    setRosterSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = { ...next[slotIndex], player: null };
      return next;
    });
    if (removed) setTradingAway((t) => t.filter((p) => p.id !== removed.id));
  };

  const openSlotSearch = (slotIndex: number) => {
    setSearchingSlotIndex(slotIndex);
    setSlotSearchQuery("");
  };

  const closeSlotSearch = () => {
    setSearchingSlotIndex(null);
    setSlotSearchQuery("");
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
    }
  };

  const removeFromReceiving = (playerId: string) => {
    setReceiving((r) => r.filter((p) => p.id !== playerId));
  };

  const resetTrade = () => {
    setTradingAway([]);
    setReceiving([]);
    setAnalysisRequested(false);
  };

  const clearAll = () => {
    const saved = getLeagueSettings();
    const rs = saved?.rosterSettings && typeof saved.rosterSettings === "object"
      ? { ...DEFAULT_ROSTER_SETTINGS, ...saved.rosterSettings }
      : DEFAULT_ROSTER_SETTINGS;
    setRosterSlots(buildRosterSlots(rs));
    setTradingAway([]);
    setReceiving([]);
    setSlotSearchQuery("");
    setReceiveSearchQuery("");
    setSearchingSlotIndex(null);
    setTradeAnalyzerState({
      roster: [],
      tradingAway: [],
      receiving: [],
    });
  };

  const addIlSpot = () => {
    setRosterSlots((prev) => [
      ...prev,
      { position: "IL", player: null, eligiblePositions: ["PG", "SG", "SF", "PF", "C"] },
    ]);
  };

  const removeIlSpot = (slotIndex: number) => {
    const slot = rosterSlots[slotIndex];
    if (slot.position !== "IL") return;
    const hadPlayer = slot.player;
    setRosterSlots((prev) => prev.filter((_, i) => i !== slotIndex));
    if (searchingSlotIndex === slotIndex) {
      setSearchingSlotIndex(null);
      setSlotSearchQuery("");
    } else if (searchingSlotIndex != null && searchingSlotIndex > slotIndex) {
      setSearchingSlotIndex(searchingSlotIndex - 1);
    }
    if (hadPlayer) setTradingAway((t) => t.filter((p) => p.id !== hadPlayer.id));
  };

  const getPositionColor = (position: RosterSlotLabel) => {
    switch (position) {
      case "PG": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "SG": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "SF": return "bg-green-500/10 text-green-400 border-green-500/30";
      case "PF": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "C": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "G": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "F": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "UTIL": return "bg-gray-500/10 text-gray-400 border-gray-500/30";
      case "BENCH": return "bg-slate-500/10 text-slate-400 border-slate-500/30";
      case "IL": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  const getPositionLabel = (slot: RosterPosition) => {
    if (slot.position === "UTIL") return "UTIL";
    if (slot.position === "BENCH") return "Bench";
    if (slot.position === "IL") return "IL";
    if (slot.position === "G") return "G";
    if (slot.position === "F") return "F";
    return slot.position;
  };

  const filledCount = rosterSlots.filter((s) => s.player != null).length;

  return (
    <div className="min-h-screen bg-[#0E1117] py-8">
      {showRosterIncompleteToast && (
        <div
          className="fixed left-1/2 top-4 z-[200] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-amber-500/40 bg-gray-900/95 px-4 py-3 shadow-lg backdrop-blur-sm"
          role="status"
        >
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
            <p className="flex-1 text-sm leading-snug text-gray-100">
              Please add a player to every roster slot before analyzing your team.
            </p>
            <button
              type="button"
              onClick={() => setShowRosterIncompleteToast(false)}
              className="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showLeagueSettingsConfirmModal && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="league-settings-confirm-title"
          onClick={() => setShowLeagueSettingsConfirmModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-600 bg-gray-900 p-6 shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="league-settings-confirm-title"
              className="text-lg font-semibold text-white mb-2"
            >
              Before we analyze
            </h2>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Confirm your league settings (format, scoring, roster size, and number of
              teams) look right. You can update them anytime in League Settings.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link
                href="/league-settings"
                className="inline-flex items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:order-1"
                onClick={() => setShowLeagueSettingsConfirmModal(false)}
              >
                Click here to edit
              </Link>
              <button
                type="button"
                disabled={draftSimLoading || rankingsLoading}
                onClick={() => void handleContinueAnalyzeTeam()}
                className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60 disabled:pointer-events-none sm:order-2"
              >
                {draftSimLoading ? "Running simulation…" : "Click here to continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-normal text-white">Trade Analyzer</h1>
          <button
            type="button"
            onClick={() => {
              if (filledCount < rosterSlots.length) {
                setShowRosterIncompleteToast(true);
                document.getElementById("current-roster")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
                return;
              }
              setShowLeagueSettingsConfirmModal(true);
            }}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-1.5 text-base font-normal text-white shadow-sm transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-[#0E1117]"
          >
            <BarChart3 className="h-5 w-5 shrink-0" />
            Analyze my Team
          </button>
        </div>

        {rankingsError && (
          <p className="mb-4 text-sm text-red-400">{rankingsError}</p>
        )}
        {draftSimError && (
          <p className="mb-4 text-sm text-red-400">{draftSimError}</p>
        )}

        {draftSimTeams && draftSimTeams.length > 0 && (
          <div
            id="draft-simulation"
            className="mb-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4 scroll-mt-8"
          >
            <h3 className="text-lg font-semibold text-white mb-1">Simulated draft</h3>
            <p className="text-sm text-gray-400 mb-3">
              {draftSimTeams.length} teams × {draftSimTeams[0]?.roster.length ?? 12} players.
              Pool = all ranked players sorted by trade value (larger than total slots is fine).
              Minimums: 1 per PG/SG/SF/PF/C per team first; remaining spots filled in snake order.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-orange-400 hover:text-orange-300">
                View team rosters
              </summary>
              <ul className="mt-3 space-y-3 max-h-80 overflow-y-auto text-gray-300">
                {draftSimTeams.map((t) => (
                  <li key={t.id} className="border-b border-gray-700/80 pb-2 last:border-0">
                    <span className="font-medium text-white">Team {t.id + 1}</span>
                    <span className="text-gray-500 text-xs ml-2">
                      ({t.roster.length} players)
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      Positions:{" "}
                      {Object.entries(t.position_counts)
                        .map(([k, v]) => `${k}:${v}`)
                        .join(" · ") || "—"}
                    </div>
                    <div className="text-xs mt-1 leading-relaxed">
                      {t.roster.map((p) => p.name).join(", ")}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* LEFT: My Team */}
          <div id="current-roster" className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 scroll-mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Your Current Roster</h2>
              <span className="text-sm text-gray-400">
                {filledCount}/{rosterSlots.length} filled
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 mb-4">
              <Link
                href="/league-settings"
                className="text-sm text-gray-400 hover:text-white underline focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
              >
                Modify Positions
              </Link>
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-gray-400 hover:text-white underline focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
              >
                Clear all
              </button>
            </div>

            {rankingsLoading ? (
              <div className="text-sm text-gray-400 py-8">Loading players…</div>
            ) : (
              <div className="space-y-1">
                {rosterSlots.map((slot, index) => (
                  <div
                    key={`${slot.position}-${index}`}
                    className="bg-gray-900/50 rounded border border-gray-700 overflow-hidden"
                  >
                    {/* One line: position | add player or player name */}
                    <div className={`flex items-center gap-2 min-h-0 border-l-2 ${getPositionColor(slot.position)} px-2 py-1.5`}>
                      <span className="text-xs font-semibold shrink-0 w-10">
                        {getPositionLabel(slot)}
                      </span>
                      <span className="text-gray-500 shrink-0">|</span>
                      {slot.player ? (
                        <>
                          <button
                            type="button"
                            onClick={() => addToTradingAway(slot.player!)}
                            className="flex-1 min-w-0 flex items-center gap-2 text-left hover:bg-gray-800/50 rounded py-0.5 px-1 -mx-1"
                          >
                            <span className="text-sm text-white truncate">
                              {slot.player.name}
                            </span>
                            {slot.player.team != null && (
                              <span className="text-xs text-gray-400 shrink-0">{slot.player.team}</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removePlayerFromSlot(index)}
                            className="p-0.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openSlotSearch(index)}
                          className="flex-1 min-w-0 flex items-center gap-1.5 text-left text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded py-0.5 px-1 -mx-1"
                        >
                          <UserPlus className="w-4 h-4 shrink-0" />
                          <span className="text-xs">Add player</span>
                        </button>
                      )}
                      {slot.position === "IL" && (
                        <button
                          type="button"
                          onClick={() => removeIlSpot(index)}
                          className="p-0.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 shrink-0 ml-auto"
                          aria-label="Remove IL spot"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {!slot.player && searchingSlotIndex === index && (
                      <div className="p-2 border-t border-gray-700 bg-gray-900/70">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search players..."
                            value={slotSearchQuery}
                            onChange={(e) => setSlotSearchQuery(e.target.value)}
                            className="w-full pl-7 pr-7 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:border-orange-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={closeSlotSearch}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-700 rounded"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                        {slotSearchQuery.trim() && (
                          <div className="mt-2 max-h-48 overflow-y-auto space-y-0.5">
                            {getFilteredPlayersForSlot(index).slice(0, 10).map((player) => (
                              <button
                                key={player.id}
                                type="button"
                                onClick={() => addPlayerToSlot(index, player)}
                                className="w-full py-1.5 px-2 hover:bg-gray-800 rounded text-left flex items-center gap-2"
                              >
                                <span className="text-xs text-white truncate flex-1">{player.name}</span>
                                <span className="text-xs text-gray-400 shrink-0">{player.team ?? "—"} • {player.position ?? "—"}</span>
                              </button>
                            ))}
                            {getFilteredPlayersForSlot(index).length === 0 && (
                              <div className="text-xs text-gray-500 text-center py-1.5">No players found</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!rankingsLoading && (
              <button
                type="button"
                onClick={addIlSpot}
                className="mt-3 w-full text-sm text-gray-400 hover:text-white underline focus:outline-none focus:ring-2 focus:ring-orange-500 rounded py-2"
              >
                click to add IL spot
              </button>
            )}
          </div>

          {/* RIGHT: Proposed Trade */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Propose a Trade</h2>
              <div className="flex items-center gap-2">
                {tradingAway.length > 0 && receiving.length > 0 && (
                  <button
                    type="button"
                    disabled={llmLoading}
                    onClick={async () => {
                      setAnalysisRequested(true);
                      setLlmLoading(true);
                      setLlmError(null);
                      setLlmAnalysis(null);
                      const leagueSettings = getLeagueSettings();
                      const tradeContext = buildTradeContextForLLM(
                        tradingAway,
                        receiving,
                        rankings,
                        {
                          useSavedWeights: true,
                          rosterSlots: rosterSlots.map((s) => ({
                            position: s.position,
                            player: s.player,
                          })),
                          leagueSettings,
                        }
                      );
                      try {
                        const data = await fetchTradeAnalysis(
                          tradeContext as unknown as Record<string, unknown>
                        );
                        if (!isLLMTradeResponse(data)) {
                          setLlmError("Invalid analysis response from server.");
                          return;
                        }
                        setLlmAnalysis(data);
                      } catch (e) {
                        setLlmError(e instanceof Error ? e.message : "Analysis failed");
                      } finally {
                        setLlmLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:pointer-events-none text-white text-sm rounded-lg transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {llmLoading ? "Analyzing…" : "Analyze Trade"}
                  </button>
                )}
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
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Players You&apos;re Trading Away</h3>
              <div className="space-y-3 min-h-[200px] bg-gray-900/30 rounded-lg p-3 border border-gray-700">
                {tradingAway.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-sm">Click players from your roster to add them here</p>
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
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Players You&apos;re Receiving</h3>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={receiveSearchQuery}
                  onChange={(e) => setReceiveSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              {receiveSearchQuery.trim() && (
                <div className="mb-3 max-h-48 overflow-y-auto space-y-1 bg-gray-900/50 rounded-lg p-2 border border-gray-700">
                  {filteredReceivePlayers.slice(0, 15).map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => addToReceiving(player)}
                      className="w-full py-1.5 px-2 hover:bg-gray-800 rounded text-left transition-colors flex items-center gap-2"
                    >
                      <span className="text-sm text-white truncate flex-1">{player.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{player.team ?? "—"} • {player.position ?? "—"}</span>
                    </button>
                  ))}
                  {filteredReceivePlayers.length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-3">No players match</div>
                  )}
                </div>
              )}

              <div className="space-y-3 min-h-[200px] bg-gray-900/30 rounded-lg p-3 border border-gray-700">
                {receiving.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-sm">Search and add players you want to receive</p>
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

        {analysisRequested && (
          <div ref={tradeSummaryRef}>
            <TradeEvaluation
              tradingAway={tradingAway}
              receiving={receiving}
              rankings={rankings}
              rosterSlots={rosterSlots.map((s) => ({ position: s.position, player: s.player }))}
              llmResponse={llmAnalysis}
              llmLoading={llmLoading}
              llmError={llmError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
