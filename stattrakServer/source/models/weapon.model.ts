// Weapon stats for a player in a match
export interface PlayerWeaponStats {
  steamId: string;
  matchId: string;
  weapon: string;
  kills: number;
  headshots: number;
  headshotPercentage: number;
  damage: number;
  shots: number;
  hits: number;
  accuracy: number;
}

// Aggregate weapon stats for a player across all matches
export interface PlayerWeaponAggregate {
  weapon: string;
  totalKills: number;
  totalHeadshots: number;
  headshotPercentage: number;
  totalDamage: number;
  totalShots: number;
  totalHits: number;
  accuracy: number;
  matchesUsed: number;
}

// Global weapon statistics across all players
export interface GlobalWeaponStats {
  weapon: string;
  totalKills: number;
  totalHeadshots: number;
  headshotPercentage: number;
  avgKillsPerMatch: number;
  usageCount: number;
  uniqueUsers: number;
}
