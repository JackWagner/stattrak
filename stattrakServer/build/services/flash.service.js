"use strict";
/**
 * Flash Statistics Service
 * ========================
 * Database queries for flashbang statistics.
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
const pool_1 = require("../database/pool");
const errors_1 = require("../utils/errors");
class FlashService {
    /**
     * Get flash stats for all players in a specific match
     */
    getMatchFlashStats(matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify match exists and get match info
            const matchResult = yield (0, pool_1.query)(`SELECT match_id, map, played_at FROM stats.matches WHERE match_id = $1`, [matchId]);
            if (matchResult.rows.length === 0) {
                throw new errors_1.NotFoundError("Match");
            }
            // Get flash stats for all players in the match
            const flashResult = yield (0, pool_1.query)(`SELECT
        match_id as "matchId",
        steam_id as "steamId",
        name,
        team,
        enemies_flashed as "enemiesFlashed",
        enemy_blind_duration as "enemyBlindDuration",
        teammates_flashed as "teammatesFlashed",
        team_blind_duration as "teamBlindDuration",
        self_flashes as "selfFlashes",
        self_blind_duration as "selfBlindDuration",
        flashes_thrown as "flashesThrown"
      FROM stats.flash_stats
      WHERE match_id = $1
      ORDER BY teammates_flashed DESC`, [matchId]);
            const players = flashResult.rows.map((row) => ({
                matchId: row.matchId,
                steamId: row.steamId,
                name: row.name,
                team: row.team,
                enemiesFlashed: row.enemiesFlashed,
                enemyBlindDuration: parseFloat(row.enemyBlindDuration),
                teammatesFlashed: row.teammatesFlashed,
                teamBlindDuration: parseFloat(row.teamBlindDuration),
                selfFlashes: row.selfFlashes,
                selfBlindDuration: parseFloat(row.selfBlindDuration),
                flashesThrown: row.flashesThrown,
            }));
            // Find worst team flasher and best flasher
            const worstTeamFlasher = players.length > 0
                ? players.reduce((max, p) => p.teammatesFlashed > max.teammatesFlashed ? p : max).name
                : "";
            const bestFlasher = players.length > 0
                ? players.reduce((max, p) => p.enemiesFlashed > max.enemiesFlashed ? p : max).name
                : "";
            return {
                matchId: matchResult.rows[0].match_id,
                map: matchResult.rows[0].map,
                playedAt: matchResult.rows[0].played_at,
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
            const result = yield (0, pool_1.query)(`SELECT
        fs.steam_id as "steamId",
        fs.name,
        COUNT(DISTINCT fs.match_id) as "totalMatches",
        SUM(fs.enemies_flashed) as "totalEnemiesFlashed",
        SUM(fs.enemy_blind_duration) as "totalEnemyBlindDuration",
        SUM(fs.teammates_flashed) as "totalTeammatesFlashed",
        SUM(fs.team_blind_duration) as "totalTeamBlindDuration",
        SUM(fs.self_flashes) as "totalSelfFlashes",
        SUM(fs.self_blind_duration) as "totalSelfBlindDuration",
        SUM(fs.flashes_thrown) as "totalFlashesThrown"
      FROM stats.flash_stats fs
      WHERE fs.steam_id = $1
      GROUP BY fs.steam_id, fs.name`, [steamId]);
            if (result.rows.length === 0) {
                throw new errors_1.NotFoundError("Player flash stats");
            }
            const row = result.rows[0];
            const totalMatches = parseInt(row.totalMatches, 10);
            const totalEnemiesFlashed = parseInt(row.totalEnemiesFlashed, 10);
            const totalTeammatesFlashed = parseInt(row.totalTeammatesFlashed, 10);
            const totalFlashesThrown = parseInt(row.totalFlashesThrown, 10);
            const totalPeopleFlashed = totalEnemiesFlashed + totalTeammatesFlashed;
            return {
                steamId: row.steamId,
                name: row.name,
                totalMatches,
                totalEnemiesFlashed,
                totalEnemyBlindDuration: parseFloat(row.totalEnemyBlindDuration),
                totalTeammatesFlashed,
                totalTeamBlindDuration: parseFloat(row.totalTeamBlindDuration),
                totalSelfFlashes: parseInt(row.totalSelfFlashes, 10),
                totalSelfBlindDuration: parseFloat(row.totalSelfBlindDuration),
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
            const offset = (pagination.page - 1) * pagination.limit;
            // Get total count of players with flash stats
            const countResult = yield (0, pool_1.query)(`SELECT COUNT(DISTINCT steam_id) as count FROM stats.flash_stats`);
            const total = parseInt(countResult.rows[0].count, 10);
            // Get leaderboard
            const result = yield (0, pool_1.query)(`SELECT
        fs.steam_id as "steamId",
        fs.name,
        SUM(fs.teammates_flashed) as "totalTeammatesFlashed",
        SUM(fs.team_blind_duration) as "totalTeamBlindDuration",
        COUNT(DISTINCT fs.match_id) as "matchCount"
      FROM stats.flash_stats fs
      GROUP BY fs.steam_id, fs.name
      HAVING SUM(fs.teammates_flashed) > 0
      ORDER BY "totalTeammatesFlashed" DESC
      LIMIT $1 OFFSET $2`, [pagination.limit, offset]);
            const items = result.rows.map((row) => {
                const matchCount = parseInt(row.matchCount, 10);
                const totalTeammatesFlashed = parseInt(row.totalTeammatesFlashed, 10);
                return {
                    steamId: row.steamId,
                    name: row.name,
                    totalTeammatesFlashed,
                    totalTeamBlindDuration: parseFloat(row.totalTeamBlindDuration),
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
            const offset = (pagination.page - 1) * pagination.limit;
            const countResult = yield (0, pool_1.query)(`SELECT COUNT(DISTINCT steam_id) as count FROM stats.flash_stats WHERE enemies_flashed > 0`);
            const total = parseInt(countResult.rows[0].count, 10);
            const result = yield (0, pool_1.query)(`SELECT
        fs.steam_id as "steamId",
        fs.name,
        SUM(fs.enemies_flashed) as "totalEnemiesFlashed",
        SUM(fs.enemy_blind_duration) as "totalEnemyBlindDuration",
        COUNT(DISTINCT fs.match_id) as "matchCount"
      FROM stats.flash_stats fs
      GROUP BY fs.steam_id, fs.name
      HAVING SUM(fs.enemies_flashed) > 0
      ORDER BY "totalEnemiesFlashed" DESC
      LIMIT $1 OFFSET $2`, [pagination.limit, offset]);
            const items = result.rows.map((row) => {
                const matchCount = parseInt(row.matchCount, 10);
                const totalEnemiesFlashed = parseInt(row.totalEnemiesFlashed, 10);
                return {
                    steamId: row.steamId,
                    name: row.name,
                    totalTeammatesFlashed: totalEnemiesFlashed, // Reusing interface
                    totalTeamBlindDuration: parseFloat(row.totalEnemyBlindDuration),
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
