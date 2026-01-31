/**
 * Damage Statistics Service
 * ==========================
 * Database queries for team damage statistics.
 * Currently using file-based storage as a PostgreSQL workaround.
 */

import { fileStore } from "../database/file-store";
import { NotFoundError } from "../utils/errors";
import {
  PlayerMatchDamageStats,
  PlayerDamageStatsAggregate,
  DamageLeaderboardEntry,
  MatchDamageSummary,
} from "../models/damage.model";
import { PaginationParams, PaginatedResponse } from "../types/api.types";

export class DamageService {
  /**
   * Get damage stats for all players in a specific match
   */
  async getMatchDamageStats(matchId: string): Promise<MatchDamageSummary> {
    // Verify match exists
    const match = fileStore.getMatchById(matchId);

    if (!match) {
      throw new NotFoundError("Match");
    }

    // Get damage stats for all players in the match
    const damageRecords = fileStore.getDamageStatsByMatchId(matchId);

    const players: PlayerMatchDamageStats[] = damageRecords.map((row) => ({
      matchId: row.match_id,
      steamId: row.steam_id,
      name: row.name,
      team: row.team,
      enemyDamage: row.enemy_damage || 0,
      teamDamage: row.team_damage || 0,
      selfDamage: row.self_damage || 0,
      totalDamage: row.total_damage || 0,
      teamDamageIncidents: row.team_damage_incidents || 0,
    }));

    // Find worst team damager and top damage dealer
    const worstTeamDamager =
      players.length > 0
        ? players.reduce((max, p) => (p.teamDamage > max.teamDamage ? p : max))
            .name
        : "";

    const topDamageDealer =
      players.length > 0
        ? players.reduce((max, p) =>
            p.enemyDamage > max.enemyDamage ? p : max,
          ).name
        : "";

    return {
      matchId: match.match_id,
      map: match.map,
      playedAt: match.played_at || match.created_at,
      players,
      worstTeamDamager,
      topDamageDealer,
    };
  }

  /**
   * Get aggregated damage stats for a specific player
   */
  async getPlayerDamageStats(
    steamId: string,
  ): Promise<PlayerDamageStatsAggregate> {
    const stats = fileStore.getDamageStatsBySteamId(steamId);

    if (!stats) {
      throw new NotFoundError("Player damage stats");
    }

    const matchCount = stats.match_count;
    const totalTeamDamage = stats.total_team_damage;
    const totalEnemyDamage = stats.total_enemy_damage;
    const totalDamage = stats.total_damage;

    return {
      steamId: stats.steam_id,
      name: stats.name,
      matchCount,
      totalEnemyDamage,
      totalTeamDamage,
      totalSelfDamage: stats.total_self_damage,
      totalDamage,
      totalTeamDamageIncidents: stats.total_team_damage_incidents,
      avgEnemyDamagePerMatch:
        matchCount > 0
          ? parseFloat((totalEnemyDamage / matchCount).toFixed(2))
          : 0,
      avgTeamDamagePerMatch:
        matchCount > 0
          ? parseFloat((totalTeamDamage / matchCount).toFixed(2))
          : 0,
      avgDamagePerMatch:
        matchCount > 0 ? parseFloat((totalDamage / matchCount).toFixed(2)) : 0,
    };
  }

  /**
   * Get team damage leaderboard (hall of shame)
   * Players ranked by most team damage
   */
  async getTeamDamageLeaderboard(
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<DamageLeaderboardEntry>> {
    const allEntries = fileStore.getTeamDamageLeaderboard();
    const total = allEntries.length;

    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedEntries = allEntries.slice(
      offset,
      offset + pagination.limit,
    );

    const items: DamageLeaderboardEntry[] = paginatedEntries.map((row) => {
      const matchCount = row.match_count;
      const totalTeamDamage = row.total_team_damage;
      return {
        steamId: row.steam_id,
        name: row.name,
        totalTeamDamage,
        totalTeamDamageIncidents: row.total_team_damage_incidents,
        matchCount,
        avgTeamDamagePerMatch:
          matchCount > 0
            ? parseFloat((totalTeamDamage / matchCount).toFixed(2))
            : 0,
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
}

export const damageService = new DamageService();
