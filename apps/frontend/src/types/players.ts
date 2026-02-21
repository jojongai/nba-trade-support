/** UI/fantasy player type. Backend only provides id + full_name; other fields are optional until backend supports them. */
export interface FantasyPlayer {
  id: string;
  name: string;
  team?: string;
  position?: string;
  fantasRank?: number;
  ppg?: number;
  rpg?: number;
  apg?: number;
  imageUrl?: string;
  injuryStatus?: "healthy" | "questionable" | "out";
  tradeValue?: number;
  volatility?: number;
}

export const POSITIONS = ["All", "PG", "SG", "SF", "PF", "C"] as const;
export const TEAMS = [
  "All",
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
] as const;
