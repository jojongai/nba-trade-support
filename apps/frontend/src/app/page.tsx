"use client";

import Link from "next/link";
import {
  TrendingUp,
  BarChart3,
  Target,
  Zap,
  Shield,
  Brain,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0E1117]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm mb-6">
              <Zap className="w-4 h-4" />
              Next-Gen Fantasy Analytics
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Make Smarter NBA
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                {" "}
                Fantasy Trades
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              NBA Trade Support combines analytics, player data, and insights to
              help you manage your fantasy league. Analyze trades and target
              players like a pro.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/trade-analyzer"
                className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-orange-500/20"
              >
                Start Analyzing Trades
              </Link>
              <Link
                href="/player-rankings"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors border border-gray-700"
              >
                View Rankings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything You Need to Win
          </h2>
          <p className="text-lg text-gray-400">
            Tools built for serious fantasy players
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-orange-500/50 transition-colors">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Trade Analyzer</h3>
            <p className="text-gray-400">
              Build and evaluate trades with feedback on fairness and category
              impact. Connect backend for full fantasy stats.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-orange-500/50 transition-colors">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Player Rankings</h3>
            <p className="text-gray-400">
              Fantasy rankings with stats and trade values. Backend not yet
              connected — UI only.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-orange-500/50 transition-colors">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Fair Value Analysis</h3>
            <p className="text-gray-400">
              Fairness scores based on player value and production when data is
              available.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-orange-500/50 transition-colors">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Insights</h3>
            <p className="text-gray-400">
              Trade recommendations and category impact when backend supports
              fantasy stats.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-orange-500/50 transition-colors">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Injury Risk</h3>
            <p className="text-gray-400">
              Injury and volatility tracking per player when data is available.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-orange-500/50 transition-colors">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Player Search</h3>
            <p className="text-gray-400">
              Search active NBA players via backend in the Trade Analyzer.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-2xl p-12 border border-orange-500/30 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Improve Your Trades?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Use the Trade Analyzer to build rosters and compare offers. Connect
            your backend for full fantasy stats and rankings.
          </p>
          <Link
            href="/trade-analyzer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-orange-500/20"
          >
            <TrendingUp className="w-5 h-5" />
            Analyze Your First Trade
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-orange-400 mb-2">500+</div>
            <div className="text-gray-400">NBA Players (backend)</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-orange-400 mb-2">—</div>
            <div className="text-gray-400">Trades Analyzed (coming soon)</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-orange-400 mb-2">—</div>
            <div className="text-gray-400">Fantasy rankings (backend)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
