import { query } from "../database/pool";
import { NotFoundError } from "../utils/errors";
import { Match, MatchDetails, MatchSummary } from "../models/match.model";
import { Round } from "../models/round.model";
import { Kill } from "../models/kill.model";
import { PlayerMatchStats } from "../models/player.model";
import { PaginationParams, PaginatedResponse } from "../types/api.types";

export class MatchService {
  // Get paginated list of matches
  async getMatches(
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<MatchSummary>> {
    const offset = (pagination.page - 1) * pagination.limit;

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM stats.matches`,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated matches with player count
    const result = await query<any>(
      `SELECT
        m.match_id as "matchId",
        m.map,
        m.played_at as "playedAt",
        m.ct_score as "ctScore",
        m.t_score as "tScore",
        m.winning_side as "winningSide",
        COUNT(pm.steam_id) as "playerCount"
      FROM stats.matches m
      LEFT JOIN stats.player_matches pm ON m.match_id = pm.match_id
      GROUP BY m.match_id, m.map, m.played_at, m.ct_score, m.t_score, m.winning_side
      ORDER BY m.played_at DESC
      LIMIT $1 OFFSET $2`,
      [pagination.limit, offset],
    );

    return {
      items: result.rows.map((row: any) => ({
        matchId: row.matchId,
        map: row.map,
        playedAt: row.playedAt,
        ctScore: row.ctScore,
        tScore: row.tScore,
        winningSide: row.winningSide,
        playerCount: parseInt(row.playerCount, 10),
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  // Get full match details
  async getMatchById(matchId: string): Promise<MatchDetails> {
    // Get match info
    const matchResult = await query<any>(
      `SELECT
        match_id as "matchId",
        map,
        demo_file as "demoFile",
        played_at as "playedAt",
        duration,
        ct_score as "ctScore",
        t_score as "tScore",
        winning_side as "winningSide",
        created_at as "createdAt"
      FROM stats.matches
      WHERE match_id = $1`,
      [matchId],
    );

    if (matchResult.rows.length === 0) {
      throw new NotFoundError("Match");
    }

    // Get player stats for this match
    const playersResult = await query<any>(
      `SELECT
        pm.match_id as "matchId",
        pm.steam_id as "steamId",
        pm.name,
        pm.team,
        pm.kills,
        pm.deaths,
        pm.assists,
        pm.adr,
        pm.headshots,
        ROUND(100.0 * pm.headshots / NULLIF(pm.kills, 0), 2) as "headshotPercentage",
        pm.mvps,
        pm.score,
        pm.result,
        m.map,
        m.played_at as "playedAt"
      FROM stats.player_matches pm
      JOIN stats.matches m ON pm.match_id = m.match_id
      WHERE pm.match_id = $1
      ORDER BY pm.score DESC`,
      [matchId],
    );

    const match = matchResult.rows[0];
    return {
      matchId: match.matchId,
      map: match.map,
      demoFile: match.demoFile,
      playedAt: match.playedAt,
      duration: match.duration,
      ctScore: match.ctScore,
      tScore: match.tScore,
      winningSide: match.winningSide,
      createdAt: match.createdAt,
      players: playersResult.rows.map((row: any) => ({
        matchId: row.matchId,
        steamId: row.steamId,
        name: row.name,
        team: row.team,
        kills: row.kills,
        deaths: row.deaths,
        assists: row.assists,
        adr: parseFloat(row.adr),
        headshots: row.headshots,
        headshotPercentage: parseFloat(row.headshotPercentage) || 0,
        mvps: row.mvps,
        score: row.score,
        result: row.result,
        map: row.map,
        playedAt: row.playedAt,
      })),
    };
  }

  // Get round-by-round breakdown for a match
  async getMatchRounds(matchId: string): Promise<Round[]> {
    // Verify match exists
    const matchExists = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM stats.matches WHERE match_id = $1`,
      [matchId],
    );

    if (parseInt(matchExists.rows[0].count, 10) === 0) {
      throw new NotFoundError("Match");
    }

    const result = await query<any>(
      `SELECT
        match_id as "matchId",
        round_number as "roundNumber",
        winner_side as "winnerSide",
        end_reason as "endReason",
        ct_score as "ctScore",
        t_score as "tScore",
        bomb_planted as "bombPlanted",
        bomb_defused as "bombDefused"
      FROM stats.rounds
      WHERE match_id = $1
      ORDER BY round_number ASC`,
      [matchId],
    );

    return result.rows.map((row: any) => ({
      matchId: row.matchId,
      roundNumber: row.roundNumber,
      winnerSide: row.winnerSide,
      endReason: row.endReason,
      ctScore: row.ctScore,
      tScore: row.tScore,
      bombPlanted: row.bombPlanted,
      bombDefused: row.bombDefused,
    }));
  }

  // Get all kills in a match
  async getMatchKills(matchId: string): Promise<Kill[]> {
    // Verify match exists
    const matchExists = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM stats.matches WHERE match_id = $1`,
      [matchId],
    );

    if (parseInt(matchExists.rows[0].count, 10) === 0) {
      throw new NotFoundError("Match");
    }

    const result = await query<any>(
      `SELECT
        id,
        match_id as "matchId",
        round_number as "roundNumber",
        tick,
        attacker_steam_id as "attackerSteamId",
        attacker_name as "attackerName",
        attacker_team as "attackerTeam",
        victim_steam_id as "victimSteamId",
        victim_name as "victimName",
        victim_team as "victimTeam",
        weapon,
        headshot,
        wallbang,
        through_smoke as "throughSmoke",
        no_scope as "noScope",
        attacker_blind as "attackerBlind",
        assister_steam_id as "assisterSteamId",
        assister_name as "assisterName",
        flash_assist as "flashAssist"
      FROM stats.kills
      WHERE match_id = $1
      ORDER BY round_number ASC, tick ASC`,
      [matchId],
    );

    return result.rows;
  }
}

export const matchService = new MatchService();
