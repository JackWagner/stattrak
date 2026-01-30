import { Team, RoundEndReason } from "../types/enums";

// Round data for a match
// Matches stats.rounds table schema
export interface Round {
  matchId: string;
  roundNumber: number;
  winnerSide: Team;
  endReason: RoundEndReason;
  ctScore: number;
  tScore: number;
  bombPlanted: boolean;
  bombDefused: boolean;
}

// Round with kill events
export interface RoundDetails extends Round {
  kills: RoundKill[];
}

// Kill event within a round
export interface RoundKill {
  tick: number;
  attackerSteamId: string;
  attackerName: string;
  attackerTeam: Team;
  victimSteamId: string;
  victimName: string;
  victimTeam: Team;
  weapon: string;
  headshot: boolean;
  wallbang: boolean;
  throughSmoke: boolean;
  noScope: boolean;
  attackerBlind: boolean;
}
