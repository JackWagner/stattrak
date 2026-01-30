import { MatchResult } from "../types/enums";

// Core player profile from database
export interface Player {
  steamId: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate stats for a player across all matches
export interface PlayerStats {
  steamId: string;
  name: string;
  totalMatches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  kd: number;
  adr: number;
  headshotPercentage: number;
  totalMvps: number;
}

// Player's performance in a single match
export interface PlayerMatchStats {
  matchId: string;
  steamId: string;
  name: string;
  team: string;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  headshots: number;
  headshotPercentage: number;
  mvps: number;
  score: number;
  result: MatchResult;
  map: string;
  playedAt: Date;
}

// Player's stats on a specific map
export interface PlayerMapStats {
  map: string;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAdr: number;
  headshotPercentage: number;
}
