"use strict";
/**
 * Flash Statistics Service
 * ========================
 * Database queries for flashbang statistics.
 * Currently using file-based storage as a PostgreSQL workaround.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flashService = exports.FlashService = void 0;
const file_store_1 = require("../database/file-store");
const errors_1 = require("../utils/errors");
class FlashService {
    /**
     * Get flash stats for all players in a specific match
     */
    getMatchFlashStats(matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify match exists
            const match = file_store_1.fileStore.getMatchById(matchId);
            if (!match) {
                throw new errors_1.NotFoundError("Match");
            }
            // Get flash stats for all players in the match
            const flashRecords = file_store_1.fileStore.getFlashStatsByMatchId(matchId);
            const players = flashRecords.map((row) => ({
                matchId: row.match_id,
                steamId: row.steam_id,
                name: row.name,
                team: row.team,
                enemiesFlashed: row.enemies_flashed || 0,
                enemyBlindDuration: parseFloat((row.enemy_blind_duration || 0).toFixed(2)),
                teammatesFlashed: row.teammates_flashed || 0,
                teamBlindDuration: parseFloat((row.team_blind_duration || 0).toFixed(2)),
                selfFlashes: row.self_flashes || 0,
                selfBlindDuration: parseFloat((row.self_blind_duration || 0).toFixed(2)),
                flashesThrown: row.flashes_thrown || 0,
            }));
            // Find worst team flasher and best flasher
            const worstTeamFlasher = players.length > 0
                ? players.reduce((max, p) => p.teammatesFlashed > max.teammatesFlashed ? p : max).name
                : "";
            const bestFlasher = players.length > 0
                ? players.reduce((max, p) => p.enemiesFlashed > max.enemiesFlashed ? p : max).name
                : "";
            return {
                matchId: match.match_id,
                map: match.map,
                playedAt: match.played_at || match.created_at,
                players,
                worstTeamFlasher,
                bestFlasher,
            };
        });
    }
    /**
     * Get aggregated flash stats for a specific player
     */
    getPlayerFlashStats(steamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = file_store_1.fileStore.getFlashStatsBySteamId(steamId);
            if (!stats) {
                throw new errors_1.NotFoundError("Player flash stats");
            }
            const totalMatches = stats.total_matches;
            const totalEnemiesFlashed = stats.total_enemies_flashed;
            const totalTeammatesFlashed = stats.total_teammates_flashed;
            const totalFlashesThrown = stats.total_flashes_thrown;
            const totalPeopleFlashed = totalEnemiesFlashed + totalTeammatesFlashed;
            return {
                steamId: stats.steam_id,
                name: stats.name,
                totalMatches,
                totalEnemiesFlashed,
                totalEnemyBlindDuration: parseFloat(stats.total_enemy_blind_duration.toFixed(2)),
                totalTeammatesFlashed,
                totalTeamBlindDuration: parseFloat(stats.total_team_blind_duration.toFixed(2)),
                totalSelfFlashes: stats.total_self_flashes,
                totalSelfBlindDuration: parseFloat(stats.total_self_blind_duration.toFixed(2)),
                totalFlashesThrown,
                avgEnemiesFlashedPerMatch: totalMatches > 0
                    ? parseFloat((totalEnemiesFlashed / totalMatches).toFixed(2))
                    : 0,
                avgTeammatesFlashedPerMatch: totalMatches > 0
                    ? parseFloat((totalTeammatesFlashed / totalMatches).toFixed(2))
                    : 0,
                flashEfficiency: totalFlashesThrown > 0
                    ? parseFloat((totalEnemiesFlashed / totalFlashesThrown).toFixed(2))
                    : 0,
                teamFlashRate: totalPeopleFlashed > 0
                    ? parseFloat(((totalTeammatesFlashed / totalPeopleFlashed) * 100).toFixed(2))
                    : 0,
            };
        });
    }
    /**
     * Get team flash leaderboard (hall of shame)
     * Players ranked by most team flashes
     */
    getTeamFlashLeaderboard(pagination) {
        return __awaiter(this, void 0, void 0, function* () {
            const allEntries = file_store_1.fileStore.getTeamFlashLeaderboard();
            const total = allEntries.length;
            const offset = (pagination.page - 1) * pagination.limit;
            const paginatedEntries = allEntries.slice(offset, offset + pagination.limit);
            const items = paginatedEntries.map((row) => {
                const matchCount = row.match_count;
                const totalTeammatesFlashed = row.total_teammates_flashed;
                return {
                    steamId: row.steam_id,
                    name: row.name,
                    totalTeammatesFlashed,
                    totalTeamBlindDuration: parseFloat(row.total_team_blind_duration.toFixed(2)),
                    matchCount,
                    avgTeamFlashesPerMatch: matchCount > 0
                        ? parseFloat((totalTeammatesFlashed / matchCount).toFixed(2))
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
        });
    }
    /**
     * Get enemy flash leaderboard (hall of fame)
     * Players ranked by most effective flashes
     */
    getEnemyFlashLeaderboard(pagination) {
        return __awaiter(this, void 0, void 0, function* () {
            const allEntries = file_store_1.fileStore.getEnemyFlashLeaderboard();
            const total = allEntries.length;
            const offset = (pagination.page - 1) * pagination.limit;
            const paginatedEntries = allEntries.slice(offset, offset + pagination.limit);
            const items = paginatedEntries.map((row) => {
                const matchCount = row.match_count;
                const totalEnemiesFlashed = row.total_enemies_flashed;
                return {
                    steamId: row.steam_id,
                    name: row.name,
                    totalTeammatesFlashed: totalEnemiesFlashed, // Reusing interface
                    totalTeamBlindDuration: parseFloat(row.total_enemy_blind_duration.toFixed(2)),
                    matchCount,
                    avgTeamFlashesPerMatch: matchCount > 0
                        ? parseFloat((totalEnemiesFlashed / matchCount).toFixed(2))
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
        });
    }
}
exports.FlashService = FlashService;
exports.flashService = new FlashService();
