"use client";

import type { FantasyPlayer } from "@/types/players";
import { X, AlertCircle } from "lucide-react";

interface PlayerCardProps {
  player: FantasyPlayer;
  onRemove?: () => void;
  showTradeValue?: boolean;
  draggable?: boolean;
  onClick?: () => void;
}

function fallbackImageUrl() {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64' fill='%23374151'%3E%3Crect width='64' height='64'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-size='24'%3E?%3C/text%3E%3C/svg%3E";
}

export function PlayerCard({
  player,
  onRemove,
  showTradeValue = false,
  draggable = false,
  onClick,
}: PlayerCardProps) {
  const getInjuryColor = (status?: string) => {
    switch (status) {
      case "out":
        return "text-red-400 bg-red-500/10";
      case "questionable":
        return "text-yellow-400 bg-yellow-500/10";
      default:
        return "text-green-400 bg-green-500/10";
    }
  };

  const getInjuryLabel = (status?: string) => {
    switch (status) {
      case "out":
        return "OUT";
      case "questionable":
        return "Q";
      default:
        return "Healthy";
    }
  };

  const imgSrc = player.imageUrl || fallbackImageUrl();
  const vol = player.volatility ?? 0;

  return (
    <div
      className={`bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 transition-all ${
        draggable ? "cursor-move" : ""
      } ${onClick ? "cursor-pointer" : ""} group relative`}
      onClick={onClick}
      draggable={draggable}
    >
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <img
          src={imgSrc}
          alt={player.name}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white truncate">{player.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {player.team != null && (
                  <>
                    <span className="text-xs text-gray-400">{player.team}</span>
                    <span className="text-xs text-gray-400">•</span>
                  </>
                )}
                {player.position != null && (
                  <>
                    <span className="text-xs text-gray-400">{player.position}</span>
                    <span className="text-xs text-gray-400">•</span>
                  </>
                )}
                {player.fantasRank != null && (
                  <span className="text-xs text-orange-400">#{player.fantasRank}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {player.ppg != null && (
              <div className="text-xs">
                <span className="text-gray-400">PPG:</span>
                <span className="text-white ml-1">{player.ppg}</span>
              </div>
            )}
            {player.rpg != null && (
              <div className="text-xs">
                <span className="text-gray-400">REB:</span>
                <span className="text-white ml-1">{player.rpg}</span>
              </div>
            )}
            {player.apg != null && (
              <div className="text-xs">
                <span className="text-gray-400">AST:</span>
                <span className="text-white ml-1">{player.apg}</span>
              </div>
            )}
            {player.ppg == null && player.rpg == null && player.apg == null && (
              <span className="text-xs text-gray-500">Stats not available</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {player.injuryStatus != null && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${getInjuryColor(
                  player.injuryStatus
                )}`}
              >
                {getInjuryLabel(player.injuryStatus)}
              </span>
            )}
            {showTradeValue && player.tradeValue != null && (
              <>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                  Value: {player.tradeValue}
                </span>
                {vol > 30 && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-xs">High Risk</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
