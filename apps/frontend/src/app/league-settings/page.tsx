"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Settings,
  Trophy,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import {
  getLeagueSettings,
  setLeagueSettings,
  type PointsSettings,
  type CategorySettings,
  type LeagueSettings,
  type RosterSettings,
} from "@/lib/league-settings";
import { ThemedSelect } from "@/components/ThemedSelect";
import { ThemedNumberInput } from "@/components/ThemedNumberInput";

const DEFAULT_POINTS_SETTINGS: PointsSettings = {
  points: 1,
  assists: 1.5,
  rebounds: 1.2,
  offensiveRebounds: 1.0,
  defensiveRebounds: 1.0,
  steals: 3,
  blocks: 3,
  turnovers: -1,
  fieldGoalsMade: 0.5,
  fieldGoalsAttempted: -0.5,
  freeThrowsMade: 1,
  freeThrowsAttempted: -0.5,
  threePointersMade: 3,
  doubleDoubles: 5,
  tripleDoubles: 10,
  technicalFouls: -2,
  flagrantFouls: -5,
  minutesPlayed: 0,
};

const DEFAULT_CATEGORIES: CategorySettings[] = [
  { name: "Points (PTS)", enabled: true },
  { name: "Assists (AST)", enabled: true },
  { name: "Rebounds (REB)", enabled: true },
  { name: "Steals (STL)", enabled: true },
  { name: "Blocks (BLK)", enabled: true },
  { name: "Turnovers (TO)", enabled: true, inverted: true },
  { name: "Field Goal % (FG%)", enabled: true },
  { name: "Free Throw % (FT%)", enabled: true },
  { name: "3-Pointers Made (3PM)", enabled: true },
  { name: "Double-Doubles", enabled: false },
  { name: "Triple-Doubles", enabled: false },
];

const DEFAULT_ROSTER_SETTINGS: RosterSettings = {
  pg: 1,
  sg: 1,
  sf: 1,
  pf: 1,
  c: 1,
  g: 1,
  f: 1,
  util: 2,
  bench: 3,
};

const PRESET_FORMATS = {
  espn: {
    points: 1,
    assists: 2,
    rebounds: 1,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    steals: 4,
    blocks: 4,
    turnovers: -2,
    fieldGoalsMade: 2,
    fieldGoalsAttempted: -1,
    freeThrowsMade: 1,
    freeThrowsAttempted: -1,
    threePointersMade: 1,
    doubleDoubles: 0,
    tripleDoubles: 0,
    technicalFouls: 0,
    flagrantFouls: 0,
    minutesPlayed: 0,
  },
  yahoo: {
    points: 1,
    assists: 1.5,
    rebounds: 1.2,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    steals: 3,
    blocks: 3,
    turnovers: -1,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    threePointersMade: 0,
    doubleDoubles: 0,
    tripleDoubles: 0,
    technicalFouls: 0,
    flagrantFouls: 0,
    minutesPlayed: 0,
  },
  sleeper: {
    points: 1,
    assists: 1.5,
    rebounds: 1.2,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    steals: 3,
    blocks: 3,
    turnovers: -1,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    threePointersMade: 0,
    doubleDoubles: 0,
    tripleDoubles: 0,
    technicalFouls: 0,
    flagrantFouls: 0,
    minutesPlayed: 0,
  },
};

export default function LeagueSettingsPage() {
  const [leagueName, setLeagueName] = useState("My Fantasy League");
  const [leagueFormat, setLeagueFormat] = useState<"points" | "category">(
    "points"
  );
  const [pointsSettings, setPointsSettings] = useState<
    Record<string, number | "">
  >(DEFAULT_POINTS_SETTINGS);
  const [categories, setCategories] =
    useState<CategorySettings[]>(DEFAULT_CATEGORIES);
  const [categoryFormat, setCategoryFormat] = useState<"h2h" | "roto">("h2h");
  const [selectedPreset, setSelectedPreset] = useState<
    "custom" | "espn" | "yahoo" | "sleeper"
  >("custom");
  const [showAdvancedPoints, setShowAdvancedPoints] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [rosterSettings, setRosterSettings] = useState<Record<keyof RosterSettings, number | "">>(DEFAULT_ROSTER_SETTINGS);
  const [rosterSettingsOpen, setRosterSettingsOpen] = useState(true);
  const [pointsSettingsOpen, setPointsSettingsOpen] = useState(true);
  const [categorySettingsOpen, setCategorySettingsOpen] = useState(true);

  const showSaveSuccess = () => {
    setSaveSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const rosterNum = (v: number | ""): number => (v === "" || v == null ? 0 : Number(v));

  useEffect(() => {
    const saved = getLeagueSettings();
    if (!saved) return;
    if (saved.leagueName != null) setLeagueName(saved.leagueName);
    if (saved.leagueFormat) setLeagueFormat(saved.leagueFormat);
    if (saved.pointsSettings && typeof saved.pointsSettings === "object")
      setPointsSettings((prev) => ({
        ...DEFAULT_POINTS_SETTINGS,
        ...prev,
        ...saved.pointsSettings,
      } as Record<string, number | "">));
    if (Array.isArray(saved.categories) && saved.categories.length > 0)
      setCategories(saved.categories);
    if (saved.categoryFormat) setCategoryFormat(saved.categoryFormat);
    if (saved.selectedPreset) setSelectedPreset(saved.selectedPreset);
    if (saved.rosterSettings && typeof saved.rosterSettings === "object")
      setRosterSettings((prev) => ({ ...DEFAULT_ROSTER_SETTINGS, ...prev, ...saved.rosterSettings } as Record<keyof RosterSettings, number | "">));
  }, []);

  const handleSave = () => {
    if (leagueFormat === "points") {
      const numericPoints: PointsSettings = {};
      const keysToValidate = Object.keys(DEFAULT_POINTS_SETTINGS);
      for (const k of keysToValidate) {
        const v = pointsSettings[k];
        numericPoints[k] = (v === "" || v == null) ? 0 : Number(v);
      }
      const rosterToSave: RosterSettings = {
        pg: rosterNum(rosterSettings.pg),
        sg: rosterNum(rosterSettings.sg),
        sf: rosterNum(rosterSettings.sf),
        pf: rosterNum(rosterSettings.pf),
        c: rosterNum(rosterSettings.c),
        g: rosterNum(rosterSettings.g),
        f: rosterNum(rosterSettings.f),
        util: rosterNum(rosterSettings.util),
        bench: rosterNum(rosterSettings.bench),
      };
      const settings: LeagueSettings = {
        leagueName,
        leagueFormat,
        selectedPreset,
        pointsSettings: numericPoints,
        rosterSettings: rosterToSave,
      };
      setLeagueSettings(settings);
      setPointsSettings(numericPoints);
      setRosterSettings(rosterToSave);
      showSaveSuccess();
      return;
    }
    const rosterToSave: RosterSettings = {
      pg: rosterNum(rosterSettings.pg),
      sg: rosterNum(rosterSettings.sg),
      sf: rosterNum(rosterSettings.sf),
      pf: rosterNum(rosterSettings.pf),
      c: rosterNum(rosterSettings.c),
      g: rosterNum(rosterSettings.g),
      f: rosterNum(rosterSettings.f),
      util: rosterNum(rosterSettings.util),
      bench: rosterNum(rosterSettings.bench),
    };
    const settings: LeagueSettings = {
      leagueName,
      leagueFormat,
      selectedPreset,
      categories: categories,
      categoryFormat,
      rosterSettings: rosterToSave,
    };
    setLeagueSettings(settings);
    setRosterSettings(rosterToSave);
    showSaveSuccess();
  };

  const handlePresetChange = (
    preset: "custom" | "espn" | "yahoo" | "sleeper"
  ) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      setPointsSettings({ ...DEFAULT_POINTS_SETTINGS, ...PRESET_FORMATS[preset] });
    }
  };

  const handlePointsChange = (key: string, value: number | "") => {
    setPointsSettings((prev) => ({ ...prev, [key]: value }));
    setSelectedPreset("custom");
  };

  const toggleCategory = (index: number) => {
    const updated = [...categories];
    updated[index].enabled = !updated[index].enabled;
    setCategories(updated);
  };

  const handleRosterChange = (position: keyof RosterSettings, value: number | "") => {
    setRosterSettings((prev) => ({ ...prev, [position]: value === "" ? "" : Math.max(0, value) }));
  };

  const getTotalRosterSpots = (): number =>
    (Object.values(rosterSettings) as (number | "")[]).reduce<number>((sum, val) => sum + rosterNum(val), 0);
  const getStartingSpots = (): number => getTotalRosterSpots() - rosterNum(rosterSettings.bench);

  const pointsCategories = [
    { key: "points", label: "Points (PTS)", description: "Points scored" },
    { key: "assists", label: "Assists (AST)", description: "Assists" },
    {
      key: "rebounds",
      label: "Rebounds (REB)",
      description: "Total rebounds",
    },
    { key: "steals", label: "Steals (STL)", description: "Steals" },
    { key: "blocks", label: "Blocks (BLK)", description: "Blocked shots" },
    {
      key: "turnovers",
      label: "Turnovers (TO)",
      description: "Turnovers (usually negative)",
    },
    {
      key: "threePointersMade",
      label: "3-Pointers Made (3PM)",
      description: "Three-pointers made",
    },
    {
      key: "freeThrowsMade",
      label: "Free Throws Made (FTM)",
      description: "Free throws made",
    },
  ];

  const advancedPointsCategories = [
    {
      key: "offensiveRebounds",
      label: "Offensive Rebounds (OREB)",
      description: "Offensive rebounds",
    },
    {
      key: "defensiveRebounds",
      label: "Defensive Rebounds (DREB)",
      description: "Defensive rebounds",
    },
    {
      key: "fieldGoalsMade",
      label: "Field Goals Made (FGM)",
      description: "Field goals made",
    },
    {
      key: "fieldGoalsAttempted",
      label: "Field Goals Attempted (FGA)",
      description: "Field goal attempts",
    },
    {
      key: "freeThrowsAttempted",
      label: "Free Throws Attempted (FTA)",
      description: "Free throw attempts",
    },
    {
      key: "doubleDoubles",
      label: "Double-Doubles",
      description: "Double-doubles achieved",
    },
    {
      key: "tripleDoubles",
      label: "Triple-Doubles",
      description: "Triple-doubles achieved",
    },
    {
      key: "technicalFouls",
      label: "Technical Fouls",
      description: "Technical fouls (usually negative)",
    },
    {
      key: "flagrantFouls",
      label: "Flagrant Fouls",
      description: "Flagrant fouls (usually negative)",
    },
    {
      key: "minutesPlayed",
      label: "Minutes Played",
      description: "Minutes played",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0E1117] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {saveSuccess && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-green-300"
          >
            <span className="font-medium">All changes saved.</span>
            <button
              type="button"
              onClick={() => setSaveSuccess(false)}
              className="text-green-400 hover:text-green-300 focus:outline-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            League Settings
          </h1>
        </div>

        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-orange-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Basic Settings
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  League Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLeagueFormat("points")}
                    className={`px-6 py-4 rounded-lg border transition-all ${
                      leagueFormat === "points"
                        ? "bg-orange-500/20 border-orange-500 text-orange-400 shadow-lg shadow-orange-500/20"
                        : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-semibold">Points League</span>
                    </div>
                    <p className="text-xs opacity-75">Total points scoring</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeagueFormat("category")}
                    className={`px-6 py-4 rounded-lg border transition-all ${
                      leagueFormat === "category"
                        ? "bg-orange-500/20 border-orange-500 text-orange-400 shadow-lg shadow-orange-500/20"
                        : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Trophy className="w-5 h-5" />
                      <span className="font-semibold">Category League</span>
                    </div>
                    <p className="text-xs opacity-75">
                      Multi-category scoring
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Roster Settings */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setRosterSettingsOpen((o) => !o)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Roster Settings
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  {getStartingSpots()} starters • {rosterNum(rosterSettings.bench)} bench • {getTotalRosterSpots()} total
                </span>
                {rosterSettingsOpen ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {rosterSettingsOpen && (
            <div className="px-6 pb-6 pt-0">
            <p className="text-sm text-gray-400 mb-6">
              Configure the number of roster spots for each position.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-sm font-medium text-white mb-2">
                  Point Guard (PG)
                </label>
                <ThemedNumberInput
                  value={rosterSettings.pg === "" || rosterSettings.pg == null ? "" : rosterSettings.pg}
                  onChange={(v) => handleRosterChange("pg", v)}
                  min={0}
                  allowEmpty
                />
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-sm font-medium text-white mb-2">
                  Shooting Guard (SG)
                </label>
                <ThemedNumberInput
                  value={rosterSettings.sg === "" || rosterSettings.sg == null ? "" : rosterSettings.sg}
                  onChange={(v) => handleRosterChange("sg", v)}
                  min={0}
                  allowEmpty
                />
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-sm font-medium text-white mb-2">
                  Small Forward (SF)
                </label>
                <ThemedNumberInput
                  value={rosterSettings.sf === "" || rosterSettings.sf == null ? "" : rosterSettings.sf}
                  onChange={(v) => handleRosterChange("sf", v)}
                  min={0}
                  allowEmpty
                />
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-sm font-medium text-white mb-2">
                  Power Forward (PF)
                </label>
                <ThemedNumberInput
                  value={rosterSettings.pf === "" || rosterSettings.pf == null ? "" : rosterSettings.pf}
                  onChange={(v) => handleRosterChange("pf", v)}
                  min={0}
                  allowEmpty
                />
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-sm font-medium text-white mb-2">
                  Center (C)
                </label>
                <ThemedNumberInput
                  value={rosterSettings.c === "" || rosterSettings.c == null ? "" : rosterSettings.c}
                  onChange={(v) => handleRosterChange("c", v)}
                  min={0}
                  allowEmpty
                />
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-sm font-medium text-white mb-2">
                  Guard (G)
                </label>
                <ThemedNumberInput
                  value={rosterSettings.g === "" || rosterSettings.g == null ? "" : rosterSettings.g}
                  onChange={(v) => handleRosterChange("g", v)}
                  min={0}
                  allowEmpty
                />
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-sm font-medium text-white mb-2">
                  Forward (F)
                </label>
                <ThemedNumberInput
                  value={rosterSettings.f === "" || rosterSettings.f == null ? "" : rosterSettings.f}
                  onChange={(v) => handleRosterChange("f", v)}
                  min={0}
                  allowEmpty
                />
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-sm font-medium text-white mb-2">
                  Utility (UTIL)
                </label>
                <ThemedNumberInput
                  value={rosterSettings.util === "" || rosterSettings.util == null ? "" : rosterSettings.util}
                  onChange={(v) => handleRosterChange("util", v)}
                  min={0}
                  allowEmpty
                />
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-sm font-medium text-white mb-2">
                  Bench (BE)
                </label>
                <ThemedNumberInput
                  value={rosterSettings.bench === "" || rosterSettings.bench == null ? "" : rosterSettings.bench}
                  onChange={(v) => handleRosterChange("bench", v)}
                  min={0}
                  allowEmpty
                />
              </div>
            </div>
            </div>
            )}
          </div>

          {/* Points League Settings */}
          {leagueFormat === "points" && (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden transition-opacity duration-300">
              <button
                type="button"
                onClick={() => setPointsSettingsOpen((o) => !o)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    Points Settings
                  </h2>
                </div>
                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                  <ThemedSelect
                    value={selectedPreset}
                    onChange={(v) => handlePresetChange(v as "custom" | "espn" | "yahoo" | "sleeper")}
                    options={[
                      { value: "custom", label: "Custom" },
                      { value: "espn", label: "ESPN Preset" },
                      { value: "yahoo", label: "Yahoo Preset" },
                      { value: "sleeper", label: "Sleeper Preset" },
                    ]}
                    className="w-40"
                  />
                  {pointsSettingsOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              </button>

              {pointsSettingsOpen && (
              <div className="px-6 pb-6 pt-0">
              <p className="text-sm text-gray-400 mb-6">
                Configure point values for each statistical category. Negative
                values penalize certain stats.
              </p>

              {/* Core Statistics */}
              <div className="space-y-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                  Core Statistics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pointsCategories.map(({ key, label, description }) => (
                    <div
                      key={key}
                      className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
                    >
                      <label className="block text-sm font-medium text-white mb-1">
                        {label}
                      </label>
                      <p className="text-xs text-gray-400 mb-2">
                        {description}
                      </p>
                      <ThemedNumberInput
                        value={pointsSettings[key] === "" || pointsSettings[key] == null ? "" : pointsSettings[key]}
                        onChange={(v) => handlePointsChange(key, v)}
                        step={0.5}
                        allowEmpty
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Stats Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedPoints(!showAdvancedPoints)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700 rounded-lg text-white transition-colors mb-4"
              >
                <span className="text-sm font-medium">
                  Advanced Statistics
                </span>
                {showAdvancedPoints ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>

              {/* Advanced Stats */}
              {showAdvancedPoints && (
                <div className="space-y-3 transition-opacity duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {advancedPointsCategories.map(
                      ({ key, label, description }) => (
                        <div
                          key={key}
                          className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
                        >
                          <label className="block text-sm font-medium text-white mb-1">
                            {label}
                          </label>
                          <p className="text-xs text-gray-400 mb-2">
                            {description}
                          </p>
                          <ThemedNumberInput
                            value={pointsSettings[key] === "" || pointsSettings[key] == null ? "" : pointsSettings[key]}
                            onChange={(v) => handlePointsChange(key, v)}
                            step={0.5}
                            allowEmpty
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
            )}
            </div>
          )}

          {/* Category League Settings */}
          {leagueFormat === "category" && (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden transition-opacity duration-300">
              <button
                type="button"
                onClick={() => setCategorySettingsOpen((o) => !o)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    Category Selection
                  </h2>
                </div>
                {categorySettingsOpen ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {categorySettingsOpen && (
              <div className="px-6 pb-6 pt-0">
              <p className="text-sm text-gray-400 mb-6">
                Select which statistical categories count toward your league
                standings.
              </p>

              {/* Active Categories */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                  Active Categories (
                  {categories.filter((c) => c.enabled).length})
                </h3>
                <div className="space-y-2">
                  {categories.map((category, index) => (
                    <div
                      key={category.name}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                        category.enabled
                          ? "bg-gray-900/50 border-gray-600"
                          : "bg-gray-900/20 border-gray-700 opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={category.enabled}
                            onChange={() => toggleCategory(index)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
                        </label>
                        <div>
                          <div className="font-medium text-white">
                            {category.name}
                          </div>
                          {category.inverted && (
                            <div className="text-xs text-yellow-400 mt-1">
                              Lower is better
                            </div>
                          )}
                        </div>
                      </div>
                      {category.enabled && (
                        <div className="text-sm text-green-400 flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          Active
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  <strong>Tip:</strong> Standard 9-category leagues use the
                  first 9 categories. Enable additional categories for custom
                  formats.
                </p>
              </div>
              </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-orange-500/20"
            >
              <Save className="w-5 h-5" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
