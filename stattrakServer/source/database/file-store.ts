/**
 * File-Based Data Store
 * =====================
 * Temporary workaround for local development without PostgreSQL.
 * Reads data from JSON files in the /tables directory.
 *
 * This module provides query-like methods that read from local JSON files
 * instead of a PostgreSQL database.
 */

import * as fs from "fs";
import * as path from "path";

// Path to tables directory
const TABLES_DIR = path.join(__dirname, "..", "..", "..", "tables");

interface TableRecord {
  [key: string]: any;
}

/**
 * Read all records from a JSON table file
 */
function readTable(tableName: string): TableRecord[] {
  const filePath = path.join(TABLES_DIR, `${tableName}.json`);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading table ${tableName}:`, error);
    return [];
  }
}

/**
 * File-based data store that mimics database queries
 */
export const fileStore = {
  // =========================================================================
  // MATCHES
  // =========================================================================

  getAllMatches(): TableRecord[] {
    return readTable("matches").sort(
      (a, b) =>
        new Date(b.played_at || b.created_at).getTime() -
        new Date(a.played_at || a.created_at).getTime(),
    );
  },

  getMatchById(matchId: string): TableRecord | null {
    const matches = readTable("matches");
    return matches.find((m) => m.match_id === matchId) || null;
  },

  getMatchCount(): number {
    return readTable("matches").length;
  },

  // =========================================================================
  // PLAYER MATCHES
  // =========================================================================

  getPlayerMatchesByMatchId(matchId: string): TableRecord[] {
    const records = readTable("player_matches");
    return records
      .filter((r) => r.match_id === matchId)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  },

  getPlayerMatchesBySteamId(steamId: string): TableRecord[] {
    const records = readTable("player_matches");
    const matches = readTable("matches");

    // Join with matches to get map and played_at
    return records
      .filter((r) => r.steam_id === steamId)
      .map((r) => {
        const match = matches.find((m) => m.match_id === r.match_id);
        return {
          ...r,
          map: match?.map,
          played_at: match?.played_at || match?.created_at,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
      );
  },

  getPlayerStats(steamId: string): TableRecord | null {
    const playerMatches = readTable("player_matches").filter(
      (r) => r.steam_id === steamId,
    );

    if (playerMatches.length === 0) return null;

    // Get the most recent name
    const name = playerMatches[playerMatches.length - 1].name;

    // Aggregate stats
    const totalMatches = playerMatches.length;
    const wins = playerMatches.filter((m) => m.result === "WIN").length;
    const losses = playerMatches.filter((m) => m.result === "LOSS").length;
    const ties = playerMatches.filter((m) => m.result === "TIE").length;
    const totalKills = playerMatches.reduce(
      (sum, m) => sum + (m.kills || 0),
      0,
    );
    const totalDeaths = playerMatches.reduce(
      (sum, m) => sum + (m.deaths || 0),
      0,
    );
    const totalAssists = playerMatches.reduce(
      (sum, m) => sum + (m.assists || 0),
      0,
    );
    const totalHeadshots = playerMatches.reduce(
      (sum, m) => sum + (m.headshots || 0),
      0,
    );
    const totalMvps = playerMatches.reduce((sum, m) => sum + (m.mvps || 0), 0);
    const avgAdr =
      playerMatches.reduce((sum, m) => sum + (m.adr || 0), 0) / totalMatches;

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
      headshot_percentage:
        totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0,
      total_mvps: totalMvps,
    };
  },

  getPlayerCountBySteamId(steamId: string): number {
    return readTable("player_matches").filter((r) => r.steam_id === steamId)
      .length;
  },

  // =========================================================================
  // ROUNDS
  // =========================================================================

  getRoundsByMatchId(matchId: string): TableRecord[] {
    return readTable("rounds")
      .filter((r) => r.match_id === matchId)
      .sort((a, b) => a.round_number - b.round_number);
  },

  // =========================================================================
  // KILLS
  // =========================================================================

  getKillsByMatchId(matchId: string): TableRecord[] {
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

  getWeaponStatsBySteamId(steamId: string): TableRecord[] {
    const records = readTable("weapon_stats").filter(
      (r) => r.steam_id === steamId,
    );

    // Aggregate by weapon
    const byWeapon: { [weapon: string]: TableRecord } = {};

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

    return Object.values(byWeapon).sort(
      (a, b) => b.total_kills - a.total_kills,
    );
  },

  // =========================================================================
  // FLASH STATS
  // =========================================================================

  getFlashStatsByMatchId(matchId: string): TableRecord[] {
    return readTable("flash_stats")
      .filter((r) => r.match_id === matchId)
      .sort((a, b) => (b.teammates_flashed || 0) - (a.teammates_flashed || 0));
  },

  getFlashStatsBySteamId(steamId: string): TableRecord | null {
    const records = readTable("flash_stats").filter(
      (r) => r.steam_id === steamId,
    );

    if (records.length === 0) return null;

    const name = records[records.length - 1].name;

    return {
      steam_id: steamId,
      name,
      total_matches: records.length,
      total_enemies_flashed: records.reduce(
        (sum, r) => sum + (r.enemies_flashed || 0),
        0,
      ),
      total_enemy_blind_duration: records.reduce(
        (sum, r) => sum + (r.enemy_blind_duration || 0),
        0,
      ),
      total_teammates_flashed: records.reduce(
        (sum, r) => sum + (r.teammates_flashed || 0),
        0,
      ),
      total_team_blind_duration: records.reduce(
        (sum, r) => sum + (r.team_blind_duration || 0),
        0,
      ),
      total_self_flashes: records.reduce(
        (sum, r) => sum + (r.self_flashes || 0),
        0,
      ),
      total_self_blind_duration: records.reduce(
        (sum, r) => sum + (r.self_blind_duration || 0),
        0,
      ),
      total_flashes_thrown: records.reduce(
        (sum, r) => sum + (r.flashes_thrown || 0),
        0,
      ),
    };
  },

  getTeamFlashLeaderboard(): TableRecord[] {
    const records = readTable("flash_stats");

    // Aggregate by player
    const byPlayer: { [steamId: string]: TableRecord } = {};

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

  getEnemyFlashLeaderboard(): TableRecord[] {
    const records = readTable("flash_stats");

    // Aggregate by player
    const byPlayer: { [steamId: string]: TableRecord } = {};

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

  getPlayerMapStats(steamId: string): TableRecord[] {
    const playerMatches = readTable("player_matches").filter(
      (r) => r.steam_id === steamId,
    );
    const matches = readTable("matches");

    // Group by map
    const byMap: { [map: string]: TableRecord[] } = {};

    for (const pm of playerMatches) {
      const match = matches.find((m) => m.match_id === pm.match_id);
      const map = match?.map || "unknown";

      if (!byMap[map]) {
        byMap[map] = [];
      }
      byMap[map].push({ ...pm, result: pm.result });
    }

    return Object.entries(byMap).map(([map, records]) => {
      const matchCount = records.length;
      const wins = records.filter((r) => r.result === "WIN").length;
      const losses = records.filter((r) => r.result === "LOSS").length;
      const ties = records.filter((r) => r.result === "TIE").length;
      const avgKills =
        records.reduce((sum, r) => sum + (r.kills || 0), 0) / matchCount;
      const avgDeaths =
        records.reduce((sum, r) => sum + (r.deaths || 0), 0) / matchCount;
      const avgAdr =
        records.reduce((sum, r) => sum + (r.adr || 0), 0) / matchCount;
      const totalKills = records.reduce((sum, r) => sum + (r.kills || 0), 0);
      const totalHeadshots = records.reduce(
        (sum, r) => sum + (r.headshots || 0),
        0,
      );

      return {
        map,
        matches: matchCount,
        wins,
        losses,
        ties,
        avg_kills: avgKills,
        avg_deaths: avgDeaths,
        avg_adr: avgAdr,
        headshot_percentage:
          totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0,
      };
    });
  },

  // =========================================================================
  // CHAT MESSAGES
  // =========================================================================

  getChatMessagesByMatchId(matchId: string): TableRecord[] {
    return readTable("chat_messages")
      .filter((r) => r.match_id === matchId)
      .sort((a, b) => a.tick - b.tick);
  },

  getAllChatMessages(): TableRecord[] {
    return readTable("chat_messages").sort((a, b) => a.tick - b.tick);
  },

  getChatMessagesBySteamId(steamId: string): TableRecord[] {
    return readTable("chat_messages")
      .filter((r) => r.steam_id === steamId)
      .sort((a, b) => a.tick - b.tick);
  },

  // =========================================================================
  // CAREER DATA (for trend analysis)
  // =========================================================================

  /**
   * Get per-match flash stats for a player (not aggregated).
   * Used for career trend analysis.
   */
  getFlashStatsPerMatchBySteamId(steamId: string): TableRecord[] {
    const records = readTable("flash_stats").filter(
      (r) => r.steam_id === steamId,
    );
    const matches = readTable("matches");

    // Add match dates for sorting
    return records
      .map((r) => {
        const match = matches.find((m) => m.match_id === r.match_id);
        return {
          ...r,
          played_at: match?.played_at || match?.created_at || "",
        };
      })
      .sort(
        (a, b) =>
          new Date(a.played_at).getTime() - new Date(b.played_at).getTime(),
      );
  },

  /**
   * Get all unique player Steam IDs from the database.
   */
  getAllPlayerSteamIds(): string[] {
    const records = readTable("player_matches");
    const steamIds = new Set<string>();
    for (const record of records) {
      if (record.steam_id) {
        steamIds.add(record.steam_id);
      }
    }
    return Array.from(steamIds);
  },

  // =========================================================================
  // VOICE FILES (metadata only - actual files stored on disk)
  // =========================================================================

  getVoiceFilesByMatchId(matchId: string): TableRecord[] {
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
    } catch (error) {
      console.error(`Error reading voice files for ${matchId}:`, error);
      return [];
    }
  },
};
