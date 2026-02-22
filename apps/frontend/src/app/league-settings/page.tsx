"use client";

import { useState } from "react";
import {
  Save,
  Settings,
  Trophy,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PointsSettings {
  [key: string]: number;
}

interface CategorySettings {
  name: string;
  enabled: boolean;
  inverted?: boolean;
}

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

const PRESET_FORMATS = {
  espn: {
    points: 1,
    assists: 1,
    rebounds: 1,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    steals: 1,
    blocks: 1,
    turnovers: -1,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    freeThrowsMade: 1,
    freeThrowsAttempted: 0,
    threePointersMade: 1,
    doubleDoubles: 0,
    tripleDoubles: 0,
    technicalFouls: 0,
    flagrantFouls: 0,
    minutesPlayed: 0,
  },
  yahoo: {
    points: 0.5,
    assists: 1.5,
    rebounds: 1.5,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    steals: 3,
    blocks: 3,
    turnovers: -1,
    fieldGoalsMade: 2,
    fieldGoalsAttempted: -1,
    freeThrowsMade: 1,
    freeThrowsAttempted: -1,
    threePointersMade: 3,
    doubleDoubles: 0,
    tripleDoubles: 0,
    technicalFouls: 0,
    flagrantFouls: 0,
    minutesPlayed: 0,
  },
  sleeper: {
    points: 1,
    assists: 1.5,
    rebounds: 1.25,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    steals: 2,
    blocks: 2,
    turnovers: -1,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    threePointersMade: 0.5,
    doubleDoubles: 1.5,
    tripleDoubles: 3,
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
  const [pointsSettings, setPointsSettings] = useState<PointsSettings>(
    DEFAULT_POINTS_SETTINGS
  );
  const [categories, setCategories] =
    useState<CategorySettings[]>(DEFAULT_CATEGORIES);
  const [categoryFormat, setCategoryFormat] = useState<"h2h" | "roto">("h2h");
  const [selectedPreset, setSelectedPreset] = useState<
    "custom" | "espn" | "yahoo" | "sleeper"
  >("custom");
  const [showAdvancedPoints, setShowAdvancedPoints] = useState(false);

  const handleSave = () => {
    const settings = {
      leagueName,
      leagueFormat,
      ...(leagueFormat === "points"
        ? { pointsSettings }
        : { categories, categoryFormat }),
    };
    console.log("Saving settings:", settings);
    alert("Settings saved successfully!");
  };

  const handlePresetChange = (
    preset: "custom" | "espn" | "yahoo" | "sleeper"
  ) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      setPointsSettings(PRESET_FORMATS[preset]);
    }
  };

  const handlePointsChange = (key: string, value: number) => {
    setPointsSettings((prev) => ({ ...prev, [key]: value }));
    setSelectedPreset("custom");
  };

  const toggleCategory = (index: number) => {
    const updated = [...categories];
    updated[index].enabled = !updated[index].enabled;
    setCategories(updated);
  };

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            League Settings
          </h1>
          <p className="text-gray-400">
            Configure your fantasy league scoring format
          </p>
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
                  League Name
                </label>
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="Enter league name"
                />
              </div>

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

          {/* Points League Settings */}
          {leagueFormat === "points" && (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 transition-opacity duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    Points Settings
                  </h2>
                </div>
                <select
                  value={selectedPreset}
                  onChange={(e) =>
                    handlePresetChange(
                      e.target.value as
                        | "custom"
                        | "espn"
                        | "yahoo"
                        | "sleeper"
                    )
                  }
                  className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="custom">Custom</option>
                  <option value="espn">ESPN Preset</option>
                  <option value="yahoo">Yahoo Preset</option>
                  <option value="sleeper">Sleeper Preset</option>
                </select>
              </div>

              <p className="text-sm text-gray-400 mb-6">
                Configure point values for each statistical category. Negative
                values penalize certain stats.
              </p>

              {/* Core Stats */}
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
                      <input
                        type="number"
                        step="0.1"
                        value={pointsSettings[key]}
                        onChange={(e) =>
                          handlePointsChange(
                            key,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
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
                          <input
                            type="number"
                            step="0.1"
                            value={pointsSettings[key]}
                            onChange={(e) =>
                              handlePointsChange(
                                key,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category League Settings */}
          {leagueFormat === "category" && (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 transition-opacity duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Category Selection
                </h2>
              </div>

              <p className="text-sm text-gray-400 mb-6">
                Select which statistical categories count toward your league
                standings.
              </p>

              {/* Category Format */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategoryFormat("h2h")}
                    className={`px-4 py-3 rounded-lg border transition-all ${
                      categoryFormat === "h2h"
                        ? "bg-orange-500/20 border-orange-500 text-orange-400"
                        : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="font-semibold">Head-to-Head</div>
                    <p className="text-xs opacity-75 mt-1">
                      Win categories each week
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFormat("roto")}
                    className={`px-4 py-3 rounded-lg border transition-all ${
                      categoryFormat === "roto"
                        ? "bg-orange-500/20 border-orange-500 text-orange-400"
                        : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="font-semibold">Rotisserie</div>
                    <p className="text-xs opacity-75 mt-1">
                      Season-long rankings
                    </p>
                  </button>
                </div>
              </div>

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
