"use strict";
/**
 * Player Service
 * ==============
 * Database queries for player data.
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
exports.playerService = exports.PlayerService = void 0;
const file_store_1 = require("../database/file-store");
const errors_1 = require("../utils/errors");
class PlayerService {
    // Get player profile with aggregate stats
    getPlayerStats(steamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = file_store_1.fileStore.getPlayerStats(steamId);
            if (!stats) {
                throw new errors_1.NotFoundError("Player");
            }
            const totalMatches = stats.total_matches;
            const totalKills = stats.total_kills;
            const totalDeaths = stats.total_deaths;
            return {
                steamId: stats.steam_id,
                name: stats.name,
                totalMatches,
                wins: stats.wins,
                losses: stats.losses,
                ties: stats.ties,
                winRate: totalMatches > 0
                    ? parseFloat(((stats.wins / totalMatches) * 100).toFixed(2))
                    : 0,
                totalKills,
                totalDeaths,
                totalAssists: stats.total_assists,
                kd: totalDeaths > 0
                    ? parseFloat((totalKills / totalDeaths).toFixed(2))
                    : totalKills,
                adr: parseFloat(stats.adr.toFixed(2)),
                headshotPercentage: parseFloat(stats.headshot_percentage.toFixed(2)),
                totalMvps: stats.total_mvps,
            };
        });
    }
    // Get player's match history with pagination
    getPlayerMatches(steamId, pagination) {
        return __awaiter(this, void 0, void 0, function* () {
            const allMatches = file_store_1.fileStore.getPlayerMatchesBySteamId(steamId);
            const total = allMatches.length;
            if (total === 0) {
                throw new errors_1.NotFoundError("Player");
            }
            const offset = (pagination.page - 1) * pagination.limit;
            const paginatedMatches = allMatches.slice(offset, offset + pagination.limit);
            const items = paginatedMatches.map((row) => ({
                matchId: row.match_id,
                steamId: row.steam_id,
                name: row.name,
                team: row.team,
                kills: row.kills,
                deaths: row.deaths,
                assists: row.assists,
                adr: row.adr,
                headshots: row.headshots,
                headshotPercentage: row.kills > 0
                    ? Math.round((row.headshots / row.kills) * 100 * 100) / 100
                    : 0,
                mvps: row.mvps,
                score: row.score,
                result: row.result,
                map: row.map,
                playedAt: row.played_at,
            }));
            return {
                items,
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
            const weaponRecords = file_store_1.fileStore.getWeaponStatsBySteamId(steamId);
            return weaponRecords.map((row) => ({
                weapon: row.weapon,
                totalKills: row.total_kills,
                totalHeadshots: row.total_headshots,
                headshotPercentage: row.total_kills > 0
                    ? parseFloat(((row.total_headshots / row.total_kills) * 100).toFixed(2))
                    : 0,
                totalDamage: row.total_damage,
                totalShots: row.total_shots,
                totalHits: row.total_hits,
                accuracy: row.total_shots > 0
                    ? parseFloat(((row.total_hits / row.total_shots) * 100).toFixed(2))
                    : 0,
                matchesUsed: row.matches_used,
            }));
        });
    }
    // Get player's performance by map
    getPlayerMapStats(steamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const mapRecords = file_store_1.fileStore.getPlayerMapStats(steamId);
            return mapRecords.map((row) => ({
                map: row.map,
                matches: row.matches,
                wins: row.wins,
                losses: row.losses,
                ties: row.ties,
                winRate: row.matches > 0
                    ? parseFloat(((row.wins / row.matches) * 100).toFixed(2))
                    : 0,
                avgKills: parseFloat(row.avg_kills.toFixed(2)),
                avgDeaths: parseFloat(row.avg_deaths.toFixed(2)),
                avgAdr: parseFloat(row.avg_adr.toFixed(2)),
                headshotPercentage: parseFloat(row.headshot_percentage.toFixed(2)),
            }));
        });
    }
}
exports.PlayerService = PlayerService;
exports.playerService = new PlayerService();
