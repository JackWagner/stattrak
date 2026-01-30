/**
 * Career Model
 * ============
 * TypeScript interfaces for player career tracking.
 * Tracks performance, sentiment, and flash stats over time.
 */

// =============================================================================
// TIMELINE DATA STRUCTURES
// =============================================================================

/** Performance stats for a single match */
export interface MatchPerformance {
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
  result: "WIN" | "LOSS" | "TIE";
  kd: number;
}

/** Sentiment stats for a single match */
export interface MatchSentiment {
  matchId: string;
  date: string;
  messageCount: number;
  avgPositive: number;
  avgNegative: number;
  avgNeutral: number;
  toxicityScore: number;
  dominantSentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
}

/** Flash stats for a single match */
export interface MatchFlashStats {
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

// =============================================================================
// AGGREGATED DATA STRUCTURES
// =============================================================================

/** Calculated trend slopes for career metrics */
export interface CareerTrends {
  kdTrend: number; // + improving, - declining
  adrTrend: number;
  winRateTrend: number;
  headshotTrend: number;
  toxicityTrend: number; // + getting more toxic, - improving
  flashEfficiencyTrend: number;
  teamFlashTrend: number; // - is good (fewer team flashes)
}

/** Lifetime career averages */
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

/** Notable career achievements and records */
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
  currentStreak: number; // + for wins, - for losses
  currentStreakType: "WIN" | "LOSS" | "";
}

/** Recent performance vs career average */
export interface RecentForm {
  matchesAnalyzed: number;
  recentKd: number;
  careerKd: number;
  kdDiff: number; // recent - career (+ = above average)
  recentAdr: number;
  careerAdr: number;
  adrDiff: number;
  recentWinRate: number;
  careerWinRate: number;
  winRateDiff: number;
  formRating: "HOT" | "AVERAGE" | "COLD";
}

/** Per-map statistics */
export interface MapStats {
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

// =============================================================================
// MAIN CAREER PROFILE
// =============================================================================

/** Complete career profile for a player */
export interface PlayerCareer {
  steamId: string;
  playerName: string;
  firstMatchDate: string | null;
  lastMatchDate: string | null;
  totalMatches: number;

  // Timelines
  performanceHistory: MatchPerformance[];
  sentimentHistory: MatchSentiment[];
  flashHistory: MatchFlashStats[];

  // Aggregations
  trends: CareerTrends;
  careerAvg: CareerAverages;
  milestones: CareerMilestones;
  recentForm: RecentForm;

  // Map-specific stats
  mapStats: MapStats[];
}
