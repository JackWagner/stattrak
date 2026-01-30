// =============================================================================
// TYPES - These define the shape of data we receive from the API
// =============================================================================
// TypeScript "interfaces" are like blueprints that describe what properties
// an object should have. They help catch errors before the code runs.
// =============================================================================

// -----------------------------------------------------------------------------
// API Response Wrapper
// -----------------------------------------------------------------------------
// Every response from our API is wrapped in this structure.
// "success" tells us if the request worked, "data" contains the actual data.
// The "<T>" is a "generic" - it means "data" can be any type we specify later.
// Example: ApiResponse<Player> means data will be a Player object
// -----------------------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;      // true if request succeeded, false if error
  data: T;               // the actual data (type varies based on endpoint)
  meta?: {               // optional pagination info (the "?" means optional)
    page?: number;       // current page number
    limit?: number;      // items per page
    total?: number;      // total items across all pages
    totalPages?: number; // total number of pages
  };
}

// -----------------------------------------------------------------------------
// Player Types
// -----------------------------------------------------------------------------

// Aggregate stats for a player across ALL their matches
export interface PlayerStats {
  steamId: string;          // unique Steam identifier (like "76561198012345678")
  name: string;             // player's display name
  totalMatches: number;     // how many matches they've played
  wins: number;             // matches won
  losses: number;           // matches lost
  ties: number;             // matches tied
  winRate: number;          // percentage of matches won (0-100)
  totalKills: number;       // lifetime kills
  totalDeaths: number;      // lifetime deaths
  totalAssists: number;     // lifetime assists
  kd: number;               // kill/death ratio (kills divided by deaths)
  adr: number;              // average damage per round
  headshotPercentage: number; // percentage of kills that were headshots
  totalMvps: number;        // total MVP awards
}

// A player's stats from ONE specific match
export interface PlayerMatchStats {
  matchId: string;          // which match this is from
  steamId: string;          // player's Steam ID
  name: string;             // player's name
  team: string;             // "CT" or "T"
  kills: number;            // kills in this match
  deaths: number;           // deaths in this match
  assists: number;          // assists in this match
  adr: number;              // average damage per round in this match
  headshots: number;        // headshot kills in this match
  headshotPercentage: number;
  mvps: number;             // MVP awards in this match
  score: number;            // total score
  result: 'WIN' | 'LOSS' | 'TIE'; // did this player's team win?
  map: string;              // which map was played
  playedAt: string;         // when the match was played (ISO date string)
}

// Player's performance on a specific map (aggregated)
export interface PlayerMapStats {
  map: string;              // map name (e.g., "de_dust2")
  matches: number;          // how many times played on this map
  wins: number;
  losses: number;
  ties: number;
  winRate: number;          // win percentage on this map
  avgKills: number;         // average kills per match on this map
  avgDeaths: number;        // average deaths per match on this map
  avgAdr: number;           // average ADR on this map
  headshotPercentage: number;
}

// -----------------------------------------------------------------------------
// Match Types
// -----------------------------------------------------------------------------

// Summary info for a match (used in match lists)
export interface MatchSummary {
  matchId: string;          // unique match identifier
  map: string;              // map name
  playedAt: string;         // when the match was played
  ctScore: number;          // Counter-Terrorist final score
  tScore: number;           // Terrorist final score
  winningSide?: string;     // "CT", "T", or undefined if tie
  playerCount: number;      // how many players in the match
}

// Full match details (includes all player stats)
export interface MatchDetails {
  matchId: string;
  map: string;
  demoFile: string;         // name of the demo file
  playedAt: string;
  duration: number;         // match duration in seconds
  ctScore: number;
  tScore: number;
  winningSide?: string;
  createdAt: string;        // when this was added to database
  players: PlayerMatchStats[]; // array of all players' stats
}

// -----------------------------------------------------------------------------
// Round Types
// -----------------------------------------------------------------------------

// Data for a single round in a match
export interface Round {
  matchId: string;
  roundNumber: number;      // 1, 2, 3, etc.
  winnerSide: 'CT' | 'T';   // which team won this round
  endReason: string;        // why the round ended (bomb exploded, elimination, etc.)
  ctScore: number;          // CT score after this round
  tScore: number;           // T score after this round
  bombPlanted: boolean;     // was the bomb planted this round?
  bombDefused: boolean;     // was the bomb defused this round?
}

// -----------------------------------------------------------------------------
// Kill Types
// -----------------------------------------------------------------------------

// Data for a single kill event
export interface Kill {
  id: number;
  matchId: string;
  roundNumber: number;
  tick: number;             // game tick when kill happened (for ordering)
  attackerSteamId: string;
  attackerName: string;
  attackerTeam: 'CT' | 'T';
  victimSteamId: string;
  victimName: string;
  victimTeam: 'CT' | 'T';
  weapon: string;           // weapon used (e.g., "ak47", "awp")
  headshot: boolean;        // was it a headshot?
  wallbang: boolean;        // did bullet go through a wall?
  throughSmoke: boolean;    // was victim in smoke?
  noScope: boolean;         // sniper kill without scoping?
  attackerBlind: boolean;   // was attacker flashed?
  assisterSteamId?: string; // Steam ID of player who assisted
  assisterName?: string;    // name of player who assisted
  flashAssist: boolean;     // was this a flash assist?
}

// -----------------------------------------------------------------------------
// Weapon Types
// -----------------------------------------------------------------------------

// Aggregate weapon stats for a player
export interface PlayerWeaponStats {
  weapon: string;           // weapon name
  totalKills: number;       // total kills with this weapon
  totalHeadshots: number;   // headshot kills with this weapon
  headshotPercentage: number;
  totalDamage: number;      // total damage dealt
  totalShots: number;       // shots fired
  totalHits: number;        // shots that hit
  accuracy: number;         // hit percentage
  matchesUsed: number;      // how many matches they used this weapon
}

// Global weapon statistics (across all players)
export interface GlobalWeaponStats {
  weapon: string;
  totalKills: number;
  totalHeadshots: number;
  headshotPercentage: number;
  avgKillsPerMatch: number;
  usageCount: number;       // how many times used across all matches
  uniqueUsers: number;      // how many different players used it
}

// -----------------------------------------------------------------------------
// Flash Types
// -----------------------------------------------------------------------------

// Flash stats for a single player in a single match
export interface PlayerMatchFlashStats {
  matchId: string;
  steamId: string;
  name: string;
  team: string;
  enemiesFlashed: number;       // enemies blinded (good)
  enemyBlindDuration: number;   // total seconds enemies were blind
  teammatesFlashed: number;     // teammates blinded (bad)
  teamBlindDuration: number;    // total seconds teammates were blind
  selfFlashes: number;          // times player flashed themselves
  selfBlindDuration: number;
  flashesThrown: number;        // total flashbangs thrown
}

// Aggregated flash stats for a player
export interface PlayerFlashStatsAggregate {
  steamId: string;
  name: string;
  totalMatches: number;
  totalEnemiesFlashed: number;
  totalEnemyBlindDuration: number;
  totalTeammatesFlashed: number;
  totalTeamBlindDuration: number;
  totalSelfFlashes: number;
  totalSelfBlindDuration: number;
  totalFlashesThrown: number;
  avgEnemiesFlashedPerMatch: number;
  avgTeammatesFlashedPerMatch: number;
  flashEfficiency: number;      // enemies flashed / flashes thrown
  teamFlashRate: number;        // % of flashes that hit teammates
}

// Flash leaderboard entry
export interface FlashLeaderboardEntry {
  steamId: string;
  name: string;
  totalTeammatesFlashed: number;
  totalTeamBlindDuration: number;
  matchCount: number;
  avgTeamFlashesPerMatch: number;
}

// Match flash summary
export interface MatchFlashSummary {
  matchId: string;
  map: string;
  playedAt: string;
  players: PlayerMatchFlashStats[];
  worstTeamFlasher: string;
  bestFlasher: string;
}

// -----------------------------------------------------------------------------
// Sentiment / Chat Types
// -----------------------------------------------------------------------------

// A single chat message from a match
export interface ChatMessage {
  matchId: string;
  tick: number;              // game tick when message was sent
  steamId: string;
  playerName: string;
  message: string;
}

// Voice file metadata
export interface VoiceFileMetadata {
  matchId: string;
  steamId: string;
  filename: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

// Combined sentiment data for a match
export interface MatchSentimentData {
  matchId: string;
  map: string;
  playedAt: string;
  chatMessages: ChatMessage[];
  voiceFiles: VoiceFileMetadata[];
  chatMessageCount: number;
  voiceFileCount: number;
}

// -----------------------------------------------------------------------------
// Career Types
// -----------------------------------------------------------------------------

// Performance stats for a single match in career history
export interface CareerMatchPerformance {
  matchId: string;
  date: string;
  map: string;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  headshotPct: number;
  mvps: number;
  score: number;
  result: 'WIN' | 'LOSS' | 'TIE';
  kd: number;
}

// Sentiment stats for a single match in career history
export interface CareerMatchSentiment {
  matchId: string;
  date: string;
  messageCount: number;
  avgPositive: number;
  avgNegative: number;
  avgNeutral: number;
  toxicityScore: number;
  dominantSentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
}

// Flash stats for a single match in career history
export interface CareerMatchFlashStats {
  matchId: string;
  date: string;
  enemiesFlashed: number;
  enemyBlindDuration: number;
  teammatesFlashed: number;
  teamBlindDuration: number;
  selfFlashes: number;
  flashesThrown: number;
  efficiency: number;
}

// Calculated trend slopes for career metrics
export interface CareerTrends {
  kdTrend: number;           // + improving, - declining
  adrTrend: number;
  winRateTrend: number;
  headshotTrend: number;
  toxicityTrend: number;     // + getting more toxic, - improving
  flashEfficiencyTrend: number;
  teamFlashTrend: number;    // - is good (fewer team flashes)
}

// Lifetime career averages
export interface CareerAverages {
  kd: number;
  adr: number;
  winRate: number;
  headshotPct: number;
  killsPerMatch: number;
  deathsPerMatch: number;
  mvpsPerMatch: number;
  toxicity: number;
  messagesPerMatch: number;
  enemiesFlashedPerMatch: number;
  teammatesFlashedPerMatch: number;
  flashEfficiency: number;
}

// Notable career achievements and records
export interface CareerMilestones {
  bestKdMatch: string | null;
  bestKdValue: number;
  worstKdMatch: string | null;
  worstKdValue: number;
  highestKillsMatch: string | null;
  highestKillsValue: number;
  mostToxicMatch: string | null;
  mostToxicValue: number;
  bestFlashMatch: string | null;
  bestFlashValue: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number;         // + for wins, - for losses
  currentStreakType: 'WIN' | 'LOSS' | '';
}

// Recent performance vs career average
export interface RecentForm {
  matchesAnalyzed: number;
  recentKd: number;
  careerKd: number;
  kdDiff: number;              // recent - career (+ = above average)
  recentAdr: number;
  careerAdr: number;
  adrDiff: number;
  recentWinRate: number;
  careerWinRate: number;
  winRateDiff: number;
  formRating: 'HOT' | 'AVERAGE' | 'COLD';
}

// Per-map career statistics
export interface CareerMapStats {
  map: string;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  avgKills: number;
  avgDeaths: number;
  avgAdr: number;
  winRate: number;
  kd: number;
}

// Complete career profile for a player
export interface PlayerCareer {
  steamId: string;
  playerName: string;
  firstMatchDate: string | null;
  lastMatchDate: string | null;
  totalMatches: number;

  // Timelines
  performanceHistory: CareerMatchPerformance[];
  sentimentHistory: CareerMatchSentiment[];
  flashHistory: CareerMatchFlashStats[];

  // Aggregations
  trends: CareerTrends;
  careerAvg: CareerAverages;
  milestones: CareerMilestones;
  recentForm: RecentForm;

  // Map-specific stats
  mapStats: CareerMapStats[];
}
