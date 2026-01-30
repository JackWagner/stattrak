import { PlayerMatchStats } from "./player.model";
import { Round } from "./round.model";

// Core match info
export interface Match {
  matchId: string;
  map: string;
  demoFile: string;
  playedAt: Date;
  duration: number; // in seconds
  ctScore: number;
  tScore: number;
  winningSide?: string;
  createdAt: Date;
}

// Match with full details including players and rounds
export interface MatchDetails extends Match {
  players: PlayerMatchStats[];
  rounds?: Round[];
}

// Summary for match list
export interface MatchSummary {
  matchId: string;
  map: string;
  playedAt: Date;
  ctScore: number;
  tScore: number;
  winningSide?: string;
  playerCount: number;
}
