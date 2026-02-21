"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, BarChart3, Settings, User } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-[#0E1117] border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">NBA Trade Support</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/trade-analyzer"
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive("/trade-analyzer")
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              Trade Analyzer
            </Link>
            <Link
              href="/player-rankings"
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive("/player-rankings")
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Player Rankings
              </div>
            </Link>
            <Link
              href="/league-settings"
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive("/league-settings")
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                League Settings
              </div>
            </Link>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="hidden sm:inline">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
