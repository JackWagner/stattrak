"use strict";
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
exports.playerService = exports.PlayerService = void 0;
const pool_1 = require("../database/pool");
const errors_1 = require("../utils/errors");
class PlayerService {
    // Get player profile with aggregate stats
    getPlayerStats(steamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, pool_1.query)(`SELECT
        pm.steam_id as "steamId",
        pm.name,
        COUNT(DISTINCT pm.match_id) as "totalMatches",
        SUM(CASE WHEN pm.result = 'WIN' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN pm.result = 'LOSS' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN pm.result = 'TIE' THEN 1 ELSE 0 END) as ties,
        SUM(pm.kills) as "totalKills",
        SUM(pm.deaths) as "totalDeaths",
        SUM(pm.assists) as "totalAssists",
        ROUND(AVG(pm.adr)::numeric, 2) as adr,
        ROUND(100.0 * SUM(pm.headshots) / NULLIF(SUM(pm.kills), 0), 2) as "headshotPercentage",
        SUM(pm.mvps) as "totalMvps"
      FROM stats.player_matches pm
      WHERE pm.steam_id = $1
      GROUP BY pm.steam_id, pm.name`, [steamId]);
            if (result.rows.length === 0) {
                throw new errors_1.NotFoundError("Player");
            }
            const row = result.rows[0];
            return {
                steamId: row.steamId,
                name: row.name,
                totalMatches: parseInt(row.totalMatches, 10),
                wins: parseInt(row.wins, 10),
                losses: parseInt(row.losses, 10),
                ties: parseInt(row.ties, 10),
                winRate: row.totalMatches > 0
                    ? parseFloat(((row.wins / row.totalMatches) * 100).toFixed(2))
                    : 0,
                totalKills: parseInt(row.totalKills, 10),
                totalDeaths: parseInt(row.totalDeaths, 10),
                totalAssists: parseInt(row.totalAssists, 10),
                kd: row.totalDeaths > 0
                    ? parseFloat((row.totalKills / row.totalDeaths).toFixed(2))
                    : row.totalKills,
                adr: parseFloat(row.adr) || 0,
                headshotPercentage: parseFloat(row.headshotPercentage) || 0,
                totalMvps: parseInt(row.totalMvps, 10),
            };
        });
    }
    // Get player's match history with pagination
    getPlayerMatches(steamId, pagination) {
        return __awaiter(this, void 0, void 0, function* () {
            const offset = (pagination.page - 1) * pagination.limit;
            // Get total count
            const countResult = yield (0, pool_1.query)(`SELECT COUNT(*) as count FROM stats.player_matches WHERE steam_id = $1`, [steamId]);
            const total = parseInt(countResult.rows[0].count, 10);
            if (total === 0) {
                throw new errors_1.NotFoundError("Player");
            }
            // Get paginated matches
            const result = yield (0, pool_1.query)(`SELECT
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
      WHERE pm.steam_id = $1
      ORDER BY m.played_at DESC
      LIMIT $2 OFFSET $3`, [steamId, pagination.limit, offset]);
            return {
                items: result.rows.map((row) => ({
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
                total,
                page: pagination.page,
                limit: pagination.limit,
                totalPages: Math.ceil(total / pagination.limit),
            };
        });
    }
    // Get player's weapon stats
    getPlayerWeapons(steamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, pool_1.query)(`SELECT
        ws.weapon,
        SUM(ws.kills) as "totalKills",
        SUM(ws.headshots) as "totalHeadshots",
        ROUND(100.0 * SUM(ws.headshots) / NULLIF(SUM(ws.kills), 0), 2) as "headshotPercentage",
        SUM(ws.damage) as "totalDamage",
        SUM(ws.shots) as "totalShots",
        SUM(ws.hits) as "totalHits",
        ROUND(100.0 * SUM(ws.hits) / NULLIF(SUM(ws.shots), 0), 2) as accuracy,
        COUNT(DISTINCT ws.match_id) as "matchesUsed"
      FROM stats.weapon_stats ws
      WHERE ws.steam_id = $1
      GROUP BY ws.weapon
      ORDER BY "totalKills" DESC`, [steamId]);
            return result.rows.map((row) => ({
                weapon: row.weapon,
                totalKills: parseInt(row.totalKills, 10),
                totalHeadshots: parseInt(row.totalHeadshots, 10),
                headshotPercentage: parseFloat(row.headshotPercentage) || 0,
                totalDamage: parseInt(row.totalDamage, 10),
                totalShots: parseInt(row.totalShots, 10),
                totalHits: parseInt(row.totalHits, 10),
                accuracy: parseFloat(row.accuracy) || 0,
                matchesUsed: parseInt(row.matchesUsed, 10),
            }));
        });
    }
    // Get player's performance by map
    getPlayerMapStats(steamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, pool_1.query)(`SELECT
        m.map,
        COUNT(*) as matches,
        SUM(CASE WHEN pm.result = 'WIN' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN pm.result = 'LOSS' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN pm.result = 'TIE' THEN 1 ELSE 0 END) as ties,
        ROUND(AVG(pm.kills)::numeric, 2) as "avgKills",
        ROUND(AVG(pm.deaths)::numeric, 2) as "avgDeaths",
        ROUND(AVG(pm.adr)::numeric, 2) as "avgAdr",
        ROUND(100.0 * SUM(pm.headshots) / NULLIF(SUM(pm.kills), 0), 2) as "headshotPercentage"
      FROM stats.player_matches pm
      JOIN stats.matches m ON pm.match_id = m.match_id
      WHERE pm.steam_id = $1
      GROUP BY m.map
      ORDER BY matches DESC`, [steamId]);
            return result.rows.map((row) => ({
                map: row.map,
                matches: parseInt(row.matches, 10),
                wins: parseInt(row.wins, 10),
                losses: parseInt(row.losses, 10),
                ties: parseInt(row.ties, 10),
                winRate: row.matches > 0
                    ? parseFloat(((row.wins / row.matches) * 100).toFixed(2))
                    : 0,
                avgKills: parseFloat(row.avgKills),
                avgDeaths: parseFloat(row.avgDeaths),
                avgAdr: parseFloat(row.avgAdr),
                headshotPercentage: parseFloat(row.headshotPercentage) || 0,
            }));
        });
    }
}
exports.PlayerService = PlayerService;
exports.playerService = new PlayerService();
