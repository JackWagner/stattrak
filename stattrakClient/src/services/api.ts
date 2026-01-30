// =============================================================================
// API SERVICE - Handles all communication with the backend server
// =============================================================================
// This file contains functions that make HTTP requests to our backend API.
// We use the built-in "fetch" function to make requests.
// Each function corresponds to one API endpoint.
// =============================================================================

import type {
  ApiResponse,
  PlayerStats,
  PlayerMatchStats,
  PlayerMapStats,
  PlayerWeaponStats,
  MatchSummary,
  MatchDetails,
  Round,
  Kill,
  GlobalWeaponStats,
  MatchFlashSummary,
  PlayerFlashStatsAggregate,
  FlashLeaderboardEntry,
  MatchSentimentData,
} from '../types';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------
// This is the base URL for our API. In development, the backend runs on port 8080.
// The "import.meta.env" is Vite's way of accessing environment variables.
// You can create a .env file with VITE_API_URL to override this.
// -----------------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// -----------------------------------------------------------------------------
// Helper Function: makeRequest
// -----------------------------------------------------------------------------
// This is a reusable function that handles the common parts of making an API request:
// 1. Makes the HTTP request using fetch()
// 2. Checks if the response was successful
// 3. Parses the JSON response
// 4. Returns the data
//
// The "<T>" is a TypeScript generic - it lets us specify what type of data
// we expect to receive. This gives us type safety and autocomplete.
// -----------------------------------------------------------------------------
async function makeRequest<T>(endpoint: string): Promise<T> {
  // fetch() makes an HTTP request. It returns a Promise (async operation).
  // We "await" it, which pauses execution until the request completes.
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  // If the server returned an error status (4xx or 5xx), throw an error
  if (!response.ok) {
    // Try to get error message from response body
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
  }

  // Parse the JSON response body and return it
  // The "as ApiResponse<T>" tells TypeScript what type to expect
  const data = await response.json() as ApiResponse<T>;

  // Return just the data portion (unwrap from ApiResponse wrapper)
  return data.data;
}

// -----------------------------------------------------------------------------
// Helper Function: makeRequestWithMeta
// -----------------------------------------------------------------------------
// Similar to makeRequest, but also returns the metadata (pagination info).
// Used for paginated endpoints like match lists.
// -----------------------------------------------------------------------------
async function makeRequestWithMeta<T>(
  endpoint: string
): Promise<{ data: T; meta?: ApiResponse<T>['meta'] }> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
  }

  const result = await response.json() as ApiResponse<T>;

  return {
    data: result.data,
    meta: result.meta,
  };
}

// =============================================================================
// PLAYER API FUNCTIONS
// =============================================================================

// -----------------------------------------------------------------------------
// getPlayer - Fetch a player's profile and aggregate stats
// -----------------------------------------------------------------------------
// Parameters:
//   steamId: The player's Steam ID (e.g., "76561198012345678")
// Returns:
//   PlayerStats object with their overall statistics
// -----------------------------------------------------------------------------
export async function getPlayer(steamId: string): Promise<PlayerStats> {
  return makeRequest<PlayerStats>(`/api/players/${steamId}`);
}

// -----------------------------------------------------------------------------
// getPlayerMatches - Fetch a player's match history (paginated)
// -----------------------------------------------------------------------------
// Parameters:
//   steamId: The player's Steam ID
//   page: Which page of results to fetch (default: 1)
//   limit: How many results per page (default: 20)
// Returns:
//   Object containing array of matches and pagination metadata
// -----------------------------------------------------------------------------
export async function getPlayerMatches(
  steamId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: PlayerMatchStats[]; meta?: ApiResponse<PlayerMatchStats[]>['meta'] }> {
  return makeRequestWithMeta<PlayerMatchStats[]>(
    `/api/players/${steamId}/matches?page=${page}&limit=${limit}`
  );
}

// -----------------------------------------------------------------------------
// getPlayerWeapons - Fetch a player's weapon statistics
// -----------------------------------------------------------------------------
// Parameters:
//   steamId: The player's Steam ID
// Returns:
//   Array of weapon stats showing kills, accuracy, etc. for each weapon
// -----------------------------------------------------------------------------
export async function getPlayerWeapons(steamId: string): Promise<PlayerWeaponStats[]> {
  return makeRequest<PlayerWeaponStats[]>(`/api/players/${steamId}/weapons`);
}

// -----------------------------------------------------------------------------
// getPlayerMaps - Fetch a player's performance broken down by map
// -----------------------------------------------------------------------------
// Parameters:
//   steamId: The player's Steam ID
// Returns:
//   Array of map stats showing win rate, average kills, etc. per map
// -----------------------------------------------------------------------------
export async function getPlayerMaps(steamId: string): Promise<PlayerMapStats[]> {
  return makeRequest<PlayerMapStats[]>(`/api/players/${steamId}/maps`);
}

// =============================================================================
// MATCH API FUNCTIONS
// =============================================================================

// -----------------------------------------------------------------------------
// getMatches - Fetch list of all matches (paginated)
// -----------------------------------------------------------------------------
// Parameters:
//   page: Which page of results (default: 1)
//   limit: Results per page (default: 20)
// Returns:
//   Object containing array of match summaries and pagination metadata
// -----------------------------------------------------------------------------
export async function getMatches(
  page: number = 1,
  limit: number = 20
): Promise<{ data: MatchSummary[]; meta?: ApiResponse<MatchSummary[]>['meta'] }> {
  return makeRequestWithMeta<MatchSummary[]>(
    `/api/matches?page=${page}&limit=${limit}`
  );
}

// -----------------------------------------------------------------------------
// getMatch - Fetch full details for a specific match
// -----------------------------------------------------------------------------
// Parameters:
//   matchId: The unique match identifier
// Returns:
//   MatchDetails object with all player stats for that match
// -----------------------------------------------------------------------------
export async function getMatch(matchId: string): Promise<MatchDetails> {
  return makeRequest<MatchDetails>(`/api/matches/${matchId}`);
}

// -----------------------------------------------------------------------------
// getMatchRounds - Fetch round-by-round breakdown for a match
// -----------------------------------------------------------------------------
// Parameters:
//   matchId: The unique match identifier
// Returns:
//   Array of Round objects, one for each round played
// -----------------------------------------------------------------------------
export async function getMatchRounds(matchId: string): Promise<Round[]> {
  return makeRequest<Round[]>(`/api/matches/${matchId}/rounds`);
}

// -----------------------------------------------------------------------------
// getMatchKills - Fetch all kill events for a match
// -----------------------------------------------------------------------------
// Parameters:
//   matchId: The unique match identifier
// Returns:
//   Array of Kill objects for every kill in the match
// -----------------------------------------------------------------------------
export async function getMatchKills(matchId: string): Promise<Kill[]> {
  return makeRequest<Kill[]>(`/api/matches/${matchId}/kills`);
}

// =============================================================================
// WEAPON API FUNCTIONS
// =============================================================================

// -----------------------------------------------------------------------------
// getWeapons - Fetch global weapon statistics across all players
// -----------------------------------------------------------------------------
// Returns:
//   Array of GlobalWeaponStats for every weapon used
// -----------------------------------------------------------------------------
export async function getWeapons(): Promise<GlobalWeaponStats[]> {
  return makeRequest<GlobalWeaponStats[]>('/api/weapons');
}

// -----------------------------------------------------------------------------
// getWeapon - Fetch stats for a specific weapon
// -----------------------------------------------------------------------------
// Parameters:
//   weaponName: The weapon name (e.g., "ak47", "awp")
// Returns:
//   GlobalWeaponStats for that specific weapon
// -----------------------------------------------------------------------------
export async function getWeapon(weaponName: string): Promise<GlobalWeaponStats> {
  return makeRequest<GlobalWeaponStats>(`/api/weapons/${weaponName}`);
}

// =============================================================================
// FLASH STATS API FUNCTIONS
// =============================================================================

// -----------------------------------------------------------------------------
// getMatchFlashStats - Fetch flash stats for all players in a match
// -----------------------------------------------------------------------------
// Parameters:
//   matchId: The unique match identifier
// Returns:
//   MatchFlashSummary with flash stats for each player
// -----------------------------------------------------------------------------
export async function getMatchFlashStats(matchId: string): Promise<MatchFlashSummary> {
  return makeRequest<MatchFlashSummary>(`/api/flashes/match/${matchId}`);
}

// -----------------------------------------------------------------------------
// getPlayerFlashStats - Fetch aggregated flash stats for a player
// -----------------------------------------------------------------------------
// Parameters:
//   steamId: The player's Steam ID
// Returns:
//   PlayerFlashStatsAggregate with lifetime flash statistics
// -----------------------------------------------------------------------------
export async function getPlayerFlashStats(steamId: string): Promise<PlayerFlashStatsAggregate> {
  return makeRequest<PlayerFlashStatsAggregate>(`/api/flashes/player/${steamId}`);
}

// -----------------------------------------------------------------------------
// getTeamFlashLeaderboard - Fetch team flash hall of shame
// -----------------------------------------------------------------------------
// Parameters:
//   page: Which page of results (default: 1)
//   limit: Results per page (default: 20)
// Returns:
//   Players ranked by most team flashes (bad!)
// -----------------------------------------------------------------------------
export async function getTeamFlashLeaderboard(
  page: number = 1,
  limit: number = 20
): Promise<{ data: FlashLeaderboardEntry[]; meta?: ApiResponse<FlashLeaderboardEntry[]>['meta'] }> {
  return makeRequestWithMeta<FlashLeaderboardEntry[]>(
    `/api/flashes/leaderboard/team?page=${page}&limit=${limit}`
  );
}

// -----------------------------------------------------------------------------
// getEnemyFlashLeaderboard - Fetch enemy flash hall of fame
// -----------------------------------------------------------------------------
// Parameters:
//   page: Which page of results (default: 1)
//   limit: Results per page (default: 20)
// Returns:
//   Players ranked by most effective enemy flashes (good!)
// -----------------------------------------------------------------------------
export async function getEnemyFlashLeaderboard(
  page: number = 1,
  limit: number = 20
): Promise<{ data: FlashLeaderboardEntry[]; meta?: ApiResponse<FlashLeaderboardEntry[]>['meta'] }> {
  return makeRequestWithMeta<FlashLeaderboardEntry[]>(
    `/api/flashes/leaderboard/enemy?page=${page}&limit=${limit}`
  );
}

// =============================================================================
// SENTIMENT API FUNCTIONS
// =============================================================================

// -----------------------------------------------------------------------------
// getMatchSentimentData - Fetch chat messages and voice file info for a match
// -----------------------------------------------------------------------------
// Parameters:
//   matchId: The unique match identifier
// Returns:
//   MatchSentimentData with chat messages and voice file metadata
// -----------------------------------------------------------------------------
export async function getMatchSentimentData(matchId: string): Promise<MatchSentimentData> {
  return makeRequest<MatchSentimentData>(`/api/sentiment/${matchId}`);
}
