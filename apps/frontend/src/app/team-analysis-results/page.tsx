"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TeamAnalysisResults } from "@/components/TeamAnalysisResults";
import {
  loadTeamAnalysisResultsPayload,
  type TeamAnalysisResultsPayload,
} from "@/lib/team-analysis-storage";

export default function TeamAnalysisResultsPage() {
  const [payload, setPayload] = useState<TeamAnalysisResultsPayload | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPayload(loadTeamAnalysisResultsPayload());
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-white mb-2">No team analysis yet</h1>
        <p className="text-gray-400 text-sm mb-6">
          Run <strong className="text-gray-300">Analyze my Team</strong> →{" "}
          <strong className="text-gray-300">Continue</strong> on the Trade Analyzer. When the
          pipeline finishes, you are taken here automatically.
        </p>
        <Link
          href="/trade-analyzer"
          className="inline-flex items-center rounded-lg border border-orange-500/60 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-300 hover:bg-orange-500/20"
        >
          Go to Trade Analyzer
        </Link>
      </div>
    );
  }

  return <TeamAnalysisResults teamAnalysis={payload.teamAnalysis} llm={payload.llm} />;
}
