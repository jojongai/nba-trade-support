"use client";

import { useState, FormEvent } from "react";
import { searchPlayers, type Player } from "@/lib/api";

export default function Home() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    const parts = q.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
    try {
      const results = await searchPlayers(
        undefined,
        firstName,
        lastName,
        true
      );
      setPlayers(results);
    } catch {
      setError("Search failed. Is the backend running at " + (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "?");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">NBA Trade Support</h1>
      <p className="mt-2 text-neutral-600 mb-8">
        Decision support for real and fantasy managers
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by player name (e.g. LeBron James)"
          className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

      {players.length > 0 && (
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg"
            >
              <span className="font-medium">{p.full_name}</span>
              <span className="text-neutral-500 text-sm">ID: {p.id}</span>
            </li>
          ))}
        </ul>
      )}

      {!loading && players.length === 0 && query && !error && (
        <p className="text-neutral-500">No active players found. Try another name.</p>
      )}
    </main>
  );
}
