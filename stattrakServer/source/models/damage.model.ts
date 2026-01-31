/**
 * Damage Statistics Models
 * =========================
 * TypeScript interfaces for damage stats (team damage tracking).
 */

export interface PlayerMatchDamageStats {
  matchId: string;
  steamId: string;
  name: string;
  team: number;
  enemyDamage: number;
  teamDamage: number;
  selfDamage: number;
  totalDamage: number;
  teamDamageIncidents: number;
}

export interface PlayerDamageStatsAggregate {
  steamId: string;
  name: string;
  matchCount: number;
  totalEnemyDamage: number;
  totalTeamDamage: number;
  totalSelfDamage: number;
  totalDamage: number;
  totalTeamDamageIncidents: number;
  avgEnemyDamagePerMatch: number;
  avgTeamDamagePerMatch: number;
  avgDamagePerMatch: number;
}

export interface DamageLeaderboardEntry {
  steamId: string;
  name: string;
  matchCount: number;
  totalTeamDamage: number;
  totalTeamDamageIncidents: number;
  avgTeamDamagePerMatch: number;
}

export interface MatchDamageSummary {
  matchId: string;
  map: string;
  playedAt: string;
  players: PlayerMatchDamageStats[];
  worstTeamDamager: string;
  topDamageDealer: string;
}
