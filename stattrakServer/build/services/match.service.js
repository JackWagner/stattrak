"use strict";
/**
 * Match Service
 * =============
 * Database queries for match data.
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
exports.matchService = exports.MatchService = void 0;
const file_store_1 = require("../database/file-store");
const errors_1 = require("../utils/errors");
class MatchService {
    // Get paginated list of matches
    getMatches(pagination) {
        return __awaiter(this, void 0, void 0, function* () {
            const allMatches = file_store_1.fileStore.getAllMatches();
            const total = allMatches.length;
            const offset = (pagination.page - 1) * pagination.limit;
            const paginatedMatches = allMatches.slice(offset, offset + pagination.limit);
            const items = paginatedMatches.map((match) => {
                const players = file_store_1.fileStore.getPlayerMatchesByMatchId(match.match_id);
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
        });
    }
    // Get full match details
    getMatchById(matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const match = file_store_1.fileStore.getMatchById(matchId);
            if (!match) {
                throw new errors_1.NotFoundError("Match");
            }
            const playerRecords = file_store_1.fileStore.getPlayerMatchesByMatchId(matchId);
            const players = playerRecords.map((row) => ({
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
        });
    }
    // Get round-by-round breakdown for a match
    getMatchRounds(matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const match = file_store_1.fileStore.getMatchById(matchId);
            if (!match) {
                throw new errors_1.NotFoundError("Match");
            }
            const roundRecords = file_store_1.fileStore.getRoundsByMatchId(matchId);
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
        });
    }
    // Get all kills in a match
    getMatchKills(matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const match = file_store_1.fileStore.getMatchById(matchId);
            if (!match) {
                throw new errors_1.NotFoundError("Match");
            }
            const killRecords = file_store_1.fileStore.getKillsByMatchId(matchId);
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
        });
    }
}
exports.MatchService = MatchService;
exports.matchService = new MatchService();
