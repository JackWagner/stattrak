/**
 * Flash Statistics Models
 * =======================
 * Interfaces for flashbang-related statistics.
 * Tracks enemy flashes (good), team flashes (bad), and self flashes.
 */

// Flash stats for a single player in a single match
export interface PlayerMatchFlashStats {
  matchId: string;
  steamId: string;
  name: string;
  team: string;

  // Enemy flashes (effective utility)
  enemiesFlashed: number;
  enemyBlindDuration: number;

  // Team flashes (detrimental)
  teammatesFlashed: number;
  teamBlindDuration: number;

  // Self flashes
  selfFlashes: number;
  selfBlindDuration: number;

  // Total flashes thrown
  flashesThrown: number;
}

// Aggregated flash stats for a player across all matches
export interface PlayerFlashStatsAggregate {
  steamId: string;
  name: string;
  totalMatches: number;

  // Totals
  totalEnemiesFlashed: number;
  totalEnemyBlindDuration: number;
  totalTeammatesFlashed: number;
  totalTeamBlindDuration: number;
  totalSelfFlashes: number;
  totalSelfBlindDuration: number;
  totalFlashesThrown: number;

  // Averages per match
  avgEnemiesFlashedPerMatch: number;
  avgTeammatesFlashedPerMatch: number;

  // Efficiency metrics
  flashEfficiency: number; // enemies flashed / flashes thrown
  teamFlashRate: number; // teammates flashed / total people flashed
}

// Flash leaderboard entry (for team flash "hall of shame")
export interface FlashLeaderboardEntry {
  steamId: string;
  name: string;
  totalTeammatesFlashed: number;
  totalTeamBlindDuration: number;
  matchCount: number;
  avgTeamFlashesPerMatch: number;
}

// Match flash summary
export interface MatchFlashSummary {
  matchId: string;
  map: string;
  playedAt: string;
  players: PlayerMatchFlashStats[];
  worstTeamFlasher: string; // Player name with most team flashes
  bestFlasher: string; // Player name with most enemy flashes
}
