"use strict";
/**
 * File-Based Data Store
 * =====================
 * Temporary workaround for local development without PostgreSQL.
 * Reads data from JSON files in the /tables directory.
 *
 * This module provides query-like methods that read from local JSON files
 * instead of a PostgreSQL database.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Path to tables directory
const TABLES_DIR = path.join(__dirname, "..", "..", "..", "tables");
/**
 * Read all records from a JSON table file
 */
function readTable(tableName) {
    const filePath = path.join(TABLES_DIR, `${tableName}.json`);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
    }
    catch (error) {
        console.error(`Error reading table ${tableName}:`, error);
        return [];
    }
}
/**
 * File-based data store that mimics database queries
 */
exports.fileStore = {
    // =========================================================================
    // MATCHES
    // =========================================================================
    getAllMatches() {
        return readTable("matches").sort((a, b) => new Date(b.played_at || b.created_at).getTime() -
            new Date(a.played_at || a.created_at).getTime());
    },
    getMatchById(matchId) {
        const matches = readTable("matches");
        return matches.find((m) => m.match_id === matchId) || null;
    },
    getMatchCount() {
        return readTable("matches").length;
    },
    // =========================================================================
    // PLAYER MATCHES
    // =========================================================================
    getPlayerMatchesByMatchId(matchId) {
        const records = readTable("player_matches");
        return records
            .filter((r) => r.match_id === matchId)
            .sort((a, b) => (b.score || 0) - (a.score || 0));
    },
    getPlayerMatchesBySteamId(steamId) {
        const records = readTable("player_matches");
        const matches = readTable("matches");
        // Join with matches to get map and played_at
        return records
            .filter((r) => r.steam_id === steamId)
            .map((r) => {
            const match = matches.find((m) => m.match_id === r.match_id);
            return Object.assign(Object.assign({}, r), { map: match === null || match === void 0 ? void 0 : match.map, played_at: (match === null || match === void 0 ? void 0 : match.played_at) || (match === null || match === void 0 ? void 0 : match.created_at) });
        })
            .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
    },
    getPlayerStats(steamId) {
        const playerMatches = readTable("player_matches").filter((r) => r.steam_id === steamId);
        if (playerMatches.length === 0)
            return null;
        // Get the most recent name
        const name = playerMatches[playerMatches.length - 1].name;
        // Aggregate stats
        const totalMatches = playerMatches.length;
        const wins = playerMatches.filter((m) => m.result === "WIN").length;
        const losses = playerMatches.filter((m) => m.result === "LOSS").length;
        const ties = playerMatches.filter((m) => m.result === "TIE").length;
        const totalKills = playerMatches.reduce((sum, m) => sum + (m.kills || 0), 0);
        const totalDeaths = playerMatches.reduce((sum, m) => sum + (m.deaths || 0), 0);
        const totalAssists = playerMatches.reduce((sum, m) => sum + (m.assists || 0), 0);
        const totalHeadshots = playerMatches.reduce((sum, m) => sum + (m.headshots || 0), 0);
        const totalMvps = playerMatches.reduce((sum, m) => sum + (m.mvps || 0), 0);
        const avgAdr = playerMatches.reduce((sum, m) => sum + (m.adr || 0), 0) / totalMatches;
        return {
            steam_id: steamId,
            name,
            total_matches: totalMatches,
            wins,
            losses,
            ties,
            total_kills: totalKills,
            total_deaths: totalDeaths,
            total_assists: totalAssists,
            adr: avgAdr,
            headshot_percentage: totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0,
            total_mvps: totalMvps,
        };
    },
    getPlayerCountBySteamId(steamId) {
        return readTable("player_matches").filter((r) => r.steam_id === steamId)
            .length;
    },
    // =========================================================================
    // ROUNDS
    // =========================================================================
    getRoundsByMatchId(matchId) {
        return readTable("rounds")
            .filter((r) => r.match_id === matchId)
            .sort((a, b) => a.round_number - b.round_number);
    },
    // =========================================================================
    // KILLS
    // =========================================================================
    getKillsByMatchId(matchId) {
        return readTable("kills")
            .filter((r) => r.match_id === matchId)
            .sort((a, b) => {
            if (a.round_number !== b.round_number) {
                return a.round_number - b.round_number;
            }
            return a.tick - b.tick;
        });
    },
    // =========================================================================
    // WEAPON STATS
    // =========================================================================
    getWeaponStatsBySteamId(steamId) {
        const records = readTable("weapon_stats").filter((r) => r.steam_id === steamId);
        // Aggregate by weapon
        const byWeapon = {};
        for (const record of records) {
            const weapon = record.weapon;
            if (!byWeapon[weapon]) {
                byWeapon[weapon] = {
                    weapon,
                    total_kills: 0,
                    total_headshots: 0,
                    total_damage: 0,
                    total_shots: 0,
                    total_hits: 0,
                    matches_used: 0,
                };
            }
            byWeapon[weapon].total_kills += record.kills || 0;
            byWeapon[weapon].total_headshots += record.headshots || 0;
            byWeapon[weapon].total_damage += record.damage || 0;
            byWeapon[weapon].total_shots += record.shots || 0;
            byWeapon[weapon].total_hits += record.hits || 0;
            byWeapon[weapon].matches_used += 1;
        }
        return Object.values(byWeapon).sort((a, b) => b.total_kills - a.total_kills);
    },
    // =========================================================================
    // FLASH STATS
    // =========================================================================
    getFlashStatsByMatchId(matchId) {
        return readTable("flash_stats")
            .filter((r) => r.match_id === matchId)
            .sort((a, b) => (b.teammates_flashed || 0) - (a.teammates_flashed || 0));
    },
    getFlashStatsBySteamId(steamId) {
        const records = readTable("flash_stats").filter((r) => r.steam_id === steamId);
        if (records.length === 0)
            return null;
        const name = records[records.length - 1].name;
        return {
            steam_id: steamId,
            name,
            total_matches: records.length,
            total_enemies_flashed: records.reduce((sum, r) => sum + (r.enemies_flashed || 0), 0),
            total_enemy_blind_duration: records.reduce((sum, r) => sum + (r.enemy_blind_duration || 0), 0),
            total_teammates_flashed: records.reduce((sum, r) => sum + (r.teammates_flashed || 0), 0),
            total_team_blind_duration: records.reduce((sum, r) => sum + (r.team_blind_duration || 0), 0),
            total_self_flashes: records.reduce((sum, r) => sum + (r.self_flashes || 0), 0),
            total_self_blind_duration: records.reduce((sum, r) => sum + (r.self_blind_duration || 0), 0),
            total_flashes_thrown: records.reduce((sum, r) => sum + (r.flashes_thrown || 0), 0),
        };
    },
    getTeamFlashLeaderboard() {
        const records = readTable("flash_stats");
        // Aggregate by player
        const byPlayer = {};
        for (const record of records) {
            const steamId = record.steam_id;
            if (!byPlayer[steamId]) {
                byPlayer[steamId] = {
                    steam_id: steamId,
                    name: record.name,
                    total_teammates_flashed: 0,
                    total_team_blind_duration: 0,
                    match_count: 0,
                };
            }
            byPlayer[steamId].total_teammates_flashed +=
                record.teammates_flashed || 0;
            byPlayer[steamId].total_team_blind_duration +=
                record.team_blind_duration || 0;
            byPlayer[steamId].match_count += 1;
            byPlayer[steamId].name = record.name; // Use most recent name
        }
        return Object.values(byPlayer)
            .filter((p) => p.total_teammates_flashed > 0)
            .sort((a, b) => b.total_teammates_flashed - a.total_teammates_flashed);
    },
    getEnemyFlashLeaderboard() {
        const records = readTable("flash_stats");
        // Aggregate by player
        const byPlayer = {};
        for (const record of records) {
            const steamId = record.steam_id;
            if (!byPlayer[steamId]) {
                byPlayer[steamId] = {
                    steam_id: steamId,
                    name: record.name,
                    total_enemies_flashed: 0,
                    total_enemy_blind_duration: 0,
                    match_count: 0,
                };
            }
            byPlayer[steamId].total_enemies_flashed += record.enemies_flashed || 0;
            byPlayer[steamId].total_enemy_blind_duration +=
                record.enemy_blind_duration || 0;
            byPlayer[steamId].match_count += 1;
            byPlayer[steamId].name = record.name;
        }
        return Object.values(byPlayer)
            .filter((p) => p.total_enemies_flashed > 0)
            .sort((a, b) => b.total_enemies_flashed - a.total_enemies_flashed);
    },
    // =========================================================================
    // PLAYER MAP STATS
    // =========================================================================
    getPlayerMapStats(steamId) {
        const playerMatches = readTable("player_matches").filter((r) => r.steam_id === steamId);
        const matches = readTable("matches");
        // Group by map
        const byMap = {};
        for (const pm of playerMatches) {
            const match = matches.find((m) => m.match_id === pm.match_id);
            const map = (match === null || match === void 0 ? void 0 : match.map) || "unknown";
            if (!byMap[map]) {
                byMap[map] = [];
            }
            byMap[map].push(Object.assign(Object.assign({}, pm), { result: pm.result }));
        }
        return Object.entries(byMap).map(([map, records]) => {
            const matchCount = records.length;
            const wins = records.filter((r) => r.result === "WIN").length;
            const losses = records.filter((r) => r.result === "LOSS").length;
            const ties = records.filter((r) => r.result === "TIE").length;
            const avgKills = records.reduce((sum, r) => sum + (r.kills || 0), 0) / matchCount;
            const avgDeaths = records.reduce((sum, r) => sum + (r.deaths || 0), 0) / matchCount;
            const avgAdr = records.reduce((sum, r) => sum + (r.adr || 0), 0) / matchCount;
            const totalKills = records.reduce((sum, r) => sum + (r.kills || 0), 0);
            const totalHeadshots = records.reduce((sum, r) => sum + (r.headshots || 0), 0);
            return {
                map,
                matches: matchCount,
                wins,
                losses,
                ties,
                avg_kills: avgKills,
                avg_deaths: avgDeaths,
                avg_adr: avgAdr,
                headshot_percentage: totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0,
            };
        });
    },
    // =========================================================================
    // CHAT MESSAGES
    // =========================================================================
    getChatMessagesByMatchId(matchId) {
        return readTable("chat_messages")
            .filter((r) => r.match_id === matchId)
            .sort((a, b) => a.tick - b.tick);
    },
    getAllChatMessages() {
        return readTable("chat_messages").sort((a, b) => a.tick - b.tick);
    },
    // =========================================================================
    // VOICE FILES (metadata only - actual files stored on disk)
    // =========================================================================
    getVoiceFilesByMatchId(matchId) {
        // Voice files are stored in tables/voice_output/<match_id>/
        // Return metadata about available files
        const voiceDir = path.join(TABLES_DIR, "voice_output", matchId);
        if (!fs.existsSync(voiceDir)) {
            return [];
        }
        try {
            const files = fs.readdirSync(voiceDir).filter((f) => f.endsWith(".wav"));
            return files.map((filename) => {
                const filePath = path.join(voiceDir, filename);
                const stats = fs.statSync(filePath);
                // Extract steam_id from filename (format: <steam_id>.wav)
                const steamId = filename.replace(".wav", "");
                return {
                    match_id: matchId,
                    steam_id: steamId,
                    filename,
                    file_path: filePath,
                    size_bytes: stats.size,
                    created_at: stats.mtime.toISOString(),
                };
            });
        }
        catch (error) {
            console.error(`Error reading voice files for ${matchId}:`, error);
            return [];
        }
    },
};
