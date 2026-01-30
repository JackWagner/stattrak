/**
 * Match Service
 * =============
 * Database queries for match data.
 * Currently using file-based storage as a PostgreSQL workaround.
 */

import { fileStore } from "../database/file-store";
import { NotFoundError } from "../utils/errors";
import type { MatchDetails, MatchSummary } from "../models/match.model";
import type { Round } from "../models/round.model";
import type { Kill } from "../models/kill.model";
import type { PlayerMatchStats } from "../models/player.model";
import type { PaginationParams, PaginatedResponse } from "../types/api.types";

export class MatchService {
  // Get paginated list of matches
  async getMatches(
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<MatchSummary>> {
    const allMatches = fileStore.getAllMatches();
    const total = allMatches.length;

    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedMatches = allMatches.slice(
      offset,
      offset + pagination.limit,
    );

    const items: MatchSummary[] = paginatedMatches.map((match) => {
      const players = fileStore.getPlayerMatchesByMatchId(match.match_id);
      return {
        matchId: match.match_id,
        map: match.map,
        playedAt: match.played_at || match.created_at,
        ctScore: match.ct_score,
        tScore: match.t_score,
        winningSide: match.winning_side,
        playerCount: players.length,
      };
    });

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  // Get full match details
  async getMatchById(matchId: string): Promise<MatchDetails> {
    const match = fileStore.getMatchById(matchId);

    if (!match) {
      throw new NotFoundError("Match");
    }

    const playerRecords = fileStore.getPlayerMatchesByMatchId(matchId);

    const players: PlayerMatchStats[] = playerRecords.map((row) => ({
      matchId: row.match_id,
      steamId: row.steam_id,
      name: row.name,
      team: row.team,
      kills: row.kills,
      deaths: row.deaths,
      assists: row.assists,
      adr: row.adr,
      headshots: row.headshots,
      headshotPercentage:
        row.kills > 0
          ? Math.round((row.headshots / row.kills) * 100 * 100) / 100
          : 0,
      mvps: row.mvps,
      score: row.score,
      result: row.result,
      map: match.map,
      playedAt: match.played_at || match.created_at,
    }));

    return {
      matchId: match.match_id,
      map: match.map,
      demoFile: match.demo_file,
      playedAt: match.played_at || match.created_at,
      duration: match.duration,
      ctScore: match.ct_score,
      tScore: match.t_score,
      winningSide: match.winning_side,
      createdAt: match.created_at,
      players,
    };
  }

  // Get round-by-round breakdown for a match
  async getMatchRounds(matchId: string): Promise<Round[]> {
    const match = fileStore.getMatchById(matchId);

    if (!match) {
      throw new NotFoundError("Match");
    }

    const roundRecords = fileStore.getRoundsByMatchId(matchId);

    return roundRecords.map((row) => ({
      matchId: row.match_id,
      roundNumber: row.round_number,
      winnerSide: row.winner_side,
      endReason: row.end_reason,
      ctScore: row.ct_score,
      tScore: row.t_score,
      bombPlanted: row.bomb_planted,
      bombDefused: row.bomb_defused,
    }));
  }

  // Get all kills in a match
  async getMatchKills(matchId: string): Promise<Kill[]> {
    const match = fileStore.getMatchById(matchId);

    if (!match) {
      throw new NotFoundError("Match");
    }

    const killRecords = fileStore.getKillsByMatchId(matchId);

    return killRecords.map((row, index) => ({
      id: index + 1,
      matchId: row.match_id,
      roundNumber: row.round_number,
      tick: row.tick,
      attackerSteamId: row.attacker_steam_id,
      attackerName: row.attacker_name,
      attackerTeam: row.attacker_team,
      victimSteamId: row.victim_steam_id,
      victimName: row.victim_name,
      victimTeam: row.victim_team,
      weapon: row.weapon,
      headshot: row.headshot,
      wallbang: row.wallbang,
      throughSmoke: row.through_smoke,
      noScope: row.no_scope,
      attackerBlind: row.attacker_blind,
      assisterSteamId: row.assister_steam_id,
      assisterName: row.assister_name,
      flashAssist: row.flash_assist,
    }));
  }
}

export const matchService = new MatchService();
