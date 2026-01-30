import { Team } from "../types/enums";

// Individual kill event from database
// Matches stats.kills table schema
export interface Kill {
  id: number;
  matchId: string;
  roundNumber: number;
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
  assisterSteamId?: string;
  assisterName?: string;
  flashAssist: boolean;
}

// Kill feed entry for display
export interface KillFeedEntry {
  tick: number;
  attackerName: string;
  attackerTeam: Team;
  victimName: string;
  victimTeam: Team;
  weapon: string;
  headshot: boolean;
  wallbang: boolean;
}
