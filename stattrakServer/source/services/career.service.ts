/**
 * Career Service
 * ==============
 * Builds player career profiles with performance trends, sentiment analysis,
 * and flash effectiveness tracking over time.
 */

import { fileStore } from "../database/file-store";
import { NotFoundError } from "../utils/errors";
import type {
  PlayerCareer,
  MatchPerformance,
  MatchSentiment,
  MatchFlashStats,
  CareerTrends,
  CareerAverages,
  CareerMilestones,
  RecentForm,
  MapStats,
} from "../models/career.model";

// =============================================================================
// TREND CALCULATION UTILITIES
// =============================================================================

/**
 * Calculate the slope of a linear regression line.
 * Returns the trend as slope per match:
 * - Positive = increasing over time
 * - Negative = decreasing over time
 * - Near zero = stable
 */
function calculateLinearTrend(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);

  // Calculate means
  const xMean = x.reduce((sum, v) => sum + v, 0) / n;
  const yMean = values.reduce((sum, v) => sum + v, 0) / n;

  // Calculate slope: sum((x - x_mean)(y - y_mean)) / sum((x - x_mean)^2)
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (values[i] - yMean);
    denominator += (x[i] - xMean) ** 2;
  }

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

/**
 * Calculate average of an array of numbers.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// =============================================================================
// SENTIMENT ANALYSIS (Simple keyword-based)
// =============================================================================

const TOXIC_KEYWORDS = [
  "noob",
  "trash",
  "bad",
  "suck",
  "idiot",
  "stupid",
  "useless",
  "terrible",
  "worst",
  "garbage",
  "bot",
  "report",
  "kick",
  "uninstall",
  "delete",
  "game",
  "gg",
  "ez",
  "ff",
];

const POSITIVE_KEYWORDS = [
  "nice",
  "good",
  "great",
  "gj",
  "wp",
  "well played",
  "nt",
  "nice try",
  "awesome",
  "amazing",
  "clutch",
  "sick",
  "insane",
  "pro",
  "legend",
  "ty",
  "thanks",
  "gl",
  "hf",
];

interface SimpleSentiment {
  positive: number;
  negative: number;
  neutral: number;
}

function analyzeMessageSentiment(message: string): SimpleSentiment {
  const lower = message.toLowerCase();
  const words = lower.split(/\s+/);

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of words) {
    if (TOXIC_KEYWORDS.some((kw) => word.includes(kw))) {
      negativeScore += 0.3;
    }
    if (POSITIVE_KEYWORDS.some((kw) => word.includes(kw))) {
      positiveScore += 0.3;
    }
  }

  // Normalize scores
  positiveScore = Math.min(positiveScore, 1);
  negativeScore = Math.min(negativeScore, 1);

  const total = positiveScore + negativeScore;
  if (total === 0) {
    return { positive: 0, negative: 0, neutral: 1 };
  }

  const neutralScore = Math.max(0, 1 - total);

  return {
    positive: positiveScore,
    negative: negativeScore,
    neutral: neutralScore,
  };
}

// =============================================================================
// CAREER SERVICE CLASS
// =============================================================================

export class CareerService {
  /**
   * Build a complete career profile for a player.
   */
  async getPlayerCareer(
    steamId: string,
    includeSentiment: boolean = true,
    includeFlashes: boolean = true,
  ): Promise<PlayerCareer> {
    // Get all matches for this player
    const playerMatches = fileStore.getPlayerMatchesBySteamId(steamId);

    if (playerMatches.length === 0) {
      throw new NotFoundError("Player");
    }

    // Get player name from most recent match
    const playerName = playerMatches[0].name || "Unknown";

    // Initialize career
    const career: PlayerCareer = {
      steamId,
      playerName,
      firstMatchDate: null,
      lastMatchDate: null,
      totalMatches: playerMatches.length,
      performanceHistory: [],
      sentimentHistory: [],
      flashHistory: [],
      trends: this.emptyTrends(),
      careerAvg: this.emptyAverages(),
      milestones: this.emptyMilestones(),
      recentForm: this.emptyRecentForm(),
      mapStats: [],
    };

    // Build performance history
    career.performanceHistory = this.buildPerformanceHistory(playerMatches);

    if (career.performanceHistory.length > 0) {
      career.firstMatchDate = career.performanceHistory[0].date;
      career.lastMatchDate =
        career.performanceHistory[career.performanceHistory.length - 1].date;
    }

    // Build sentiment history
    if (includeSentiment) {
      career.sentimentHistory = this.buildSentimentHistory(steamId);
    }

    // Build flash history
    if (includeFlashes) {
      career.flashHistory = this.buildFlashHistory(steamId);
    }

    // Calculate aggregations
    career.careerAvg = this.calculateCareerAverages(career);
    career.trends = this.calculateTrends(career);
    career.milestones = this.calculateMilestones(career);
    career.recentForm = this.calculateRecentForm(career);
    career.mapStats = this.calculateMapStats(career);

    return career;
  }

  private buildPerformanceHistory(
    playerMatches: Record<string, unknown>[],
  ): MatchPerformance[] {
    const matches = fileStore.getAllMatches();
    const matchDates = new Map<string, string>();
    const matchMaps = new Map<string, string>();

    for (const m of matches) {
      matchDates.set(
        m.match_id as string,
        (m.played_at || m.created_at || "") as string,
      );
      matchMaps.set(m.match_id as string, (m.map || "unknown") as string);
    }

    const history: MatchPerformance[] = [];

    for (const pm of playerMatches) {
      const matchId = pm.match_id as string;
      const kills = (pm.kills as number) || 0;
      const deaths = (pm.deaths as number) || 0;
      const headshots = (pm.headshots as number) || 0;

      const kd = deaths > 0 ? kills / deaths : kills;
      const hsPct = kills > 0 ? (headshots / kills) * 100 : 0;

      history.push({
        matchId,
        date: matchDates.get(matchId) || "",
        map: matchMaps.get(matchId) || "unknown",
        kills,
        deaths,
        assists: (pm.assists as number) || 0,
        adr: (pm.adr as number) || 0,
        headshotPct: Math.round(hsPct * 10) / 10,
        mvps: (pm.mvps as number) || 0,
        score: (pm.score as number) || 0,
        result: (pm.result as "WIN" | "LOSS" | "TIE") || "TIE",
        kd: Math.round(kd * 100) / 100,
      });
    }

    // Sort by date (oldest first for trend calculation)
    history.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return history;
  }

  private buildSentimentHistory(steamId: string): MatchSentiment[] {
    const matches = fileStore.getAllMatches();
    const matchDates = new Map<string, string>();

    for (const m of matches) {
      matchDates.set(
        m.match_id as string,
        (m.played_at || m.created_at || "") as string,
      );
    }

    // Get this player's messages grouped by match
    const playerMessages = fileStore.getChatMessagesBySteamId(steamId);
    const messagesByMatch = new Map<string, Record<string, unknown>[]>();

    for (const msg of playerMessages) {
      const matchId = msg.match_id as string;
      if (!messagesByMatch.has(matchId)) {
        messagesByMatch.set(matchId, []);
      }
      messagesByMatch.get(matchId)!.push(msg);
    }

    const history: MatchSentiment[] = [];

    for (const [matchId, messages] of messagesByMatch) {
      if (messages.length === 0) continue;

      // Analyze sentiment for each message
      const sentiments: SimpleSentiment[] = [];
      for (const msg of messages) {
        const sentiment = analyzeMessageSentiment((msg.message as string) || "");
        sentiments.push(sentiment);
      }

      const avgPositive = mean(sentiments.map((s) => s.positive));
      const avgNegative = mean(sentiments.map((s) => s.negative));
      const avgNeutral = mean(sentiments.map((s) => s.neutral));
      const toxicCount = sentiments.filter((s) => s.negative > 0.4).length;
      const toxicityScore = (toxicCount / sentiments.length) * 100;

      // Determine dominant sentiment
      let dominantSentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
      const scores = { POSITIVE: avgPositive, NEGATIVE: avgNegative, NEUTRAL: avgNeutral };
      const maxScore = Math.max(avgPositive, avgNegative, avgNeutral);

      if (maxScore === avgPositive) {
        dominantSentiment = "POSITIVE";
      } else if (maxScore === avgNegative) {
        dominantSentiment = "NEGATIVE";
      } else {
        dominantSentiment = "NEUTRAL";
      }

      history.push({
        matchId,
        date: matchDates.get(matchId) || "",
        messageCount: messages.length,
        avgPositive: Math.round(avgPositive * 1000) / 1000,
        avgNegative: Math.round(avgNegative * 1000) / 1000,
        avgNeutral: Math.round(avgNeutral * 1000) / 1000,
        toxicityScore: Math.round(toxicityScore * 10) / 10,
        dominantSentiment,
      });
    }

    // Sort by date
    history.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return history;
  }

  private buildFlashHistory(steamId: string): MatchFlashStats[] {
    const flashRecords = fileStore.getFlashStatsPerMatchBySteamId(steamId);

    if (flashRecords.length === 0) {
      return [];
    }

    const history: MatchFlashStats[] = [];

    for (const fr of flashRecords) {
      const enemies = (fr.enemies_flashed as number) || 0;
      const thrown = (fr.flashes_thrown as number) || 0;
      const efficiency = thrown > 0 ? enemies / thrown : 0;

      history.push({
        matchId: fr.match_id as string,
        date: (fr.played_at as string) || "",
        enemiesFlashed: enemies,
        enemyBlindDuration: (fr.enemy_blind_duration as number) || 0,
        teammatesFlashed: (fr.teammates_flashed as number) || 0,
        teamBlindDuration: (fr.team_blind_duration as number) || 0,
        selfFlashes: (fr.self_flashes as number) || 0,
        flashesThrown: thrown,
        efficiency: Math.round(efficiency * 100) / 100,
      });
    }

    // Already sorted by date from file-store
    return history;
  }

  private calculateCareerAverages(career: PlayerCareer): CareerAverages {
    const avg = this.emptyAverages();

    if (career.performanceHistory.length === 0) {
      return avg;
    }

    const perf = career.performanceHistory;
    const n = perf.length;

    const totalKills = perf.reduce((sum, p) => sum + p.kills, 0);
    const totalDeaths = perf.reduce((sum, p) => sum + p.deaths, 0);
    const wins = perf.filter((p) => p.result === "WIN").length;

    avg.kd =
      totalDeaths > 0
        ? Math.round((totalKills / totalDeaths) * 100) / 100
        : totalKills;
    avg.adr = Math.round(mean(perf.map((p) => p.adr)) * 10) / 10;
    avg.winRate = Math.round((wins / n) * 1000) / 10;
    avg.headshotPct = Math.round(mean(perf.map((p) => p.headshotPct)) * 10) / 10;
    avg.killsPerMatch = Math.round((totalKills / n) * 10) / 10;
    avg.deathsPerMatch = Math.round((totalDeaths / n) * 10) / 10;
    avg.mvpsPerMatch =
      Math.round((perf.reduce((sum, p) => sum + p.mvps, 0) / n) * 10) / 10;

    // Sentiment averages
    if (career.sentimentHistory.length > 0) {
      const sent = career.sentimentHistory;
      avg.toxicity = Math.round(mean(sent.map((s) => s.toxicityScore)) * 10) / 10;
      avg.messagesPerMatch =
        Math.round((sent.reduce((sum, s) => sum + s.messageCount, 0) / sent.length) * 10) / 10;
    }

    // Flash averages
    if (career.flashHistory.length > 0) {
      const fl = career.flashHistory;
      avg.enemiesFlashedPerMatch =
        Math.round(mean(fl.map((f) => f.enemiesFlashed)) * 10) / 10;
      avg.teammatesFlashedPerMatch =
        Math.round(mean(fl.map((f) => f.teammatesFlashed)) * 10) / 10;

      const totalEnemies = fl.reduce((sum, f) => sum + f.enemiesFlashed, 0);
      const totalThrown = fl.reduce((sum, f) => sum + f.flashesThrown, 0);
      avg.flashEfficiency =
        totalThrown > 0
          ? Math.round((totalEnemies / totalThrown) * 100) / 100
          : 0;
    }

    return avg;
  }

  private calculateTrends(career: PlayerCareer): CareerTrends {
    const trends = this.emptyTrends();

    if (career.performanceHistory.length >= 3) {
      const perf = career.performanceHistory;
      trends.kdTrend =
        Math.round(calculateLinearTrend(perf.map((p) => p.kd)) * 10000) / 10000;
      trends.adrTrend =
        Math.round(calculateLinearTrend(perf.map((p) => p.adr)) * 10000) / 10000;
      trends.headshotTrend =
        Math.round(calculateLinearTrend(perf.map((p) => p.headshotPct)) * 10000) / 10000;

      // Win rate trend (convert to 1/0)
      const winValues = perf.map((p) => (p.result === "WIN" ? 1 : 0));
      trends.winRateTrend =
        Math.round(calculateLinearTrend(winValues) * 10000) / 10000;
    }

    if (career.sentimentHistory.length >= 3) {
      const sent = career.sentimentHistory;
      trends.toxicityTrend =
        Math.round(calculateLinearTrend(sent.map((s) => s.toxicityScore)) * 10000) / 10000;
    }

    if (career.flashHistory.length >= 3) {
      const fl = career.flashHistory;
      trends.flashEfficiencyTrend =
        Math.round(calculateLinearTrend(fl.map((f) => f.efficiency)) * 10000) / 10000;
      trends.teamFlashTrend =
        Math.round(calculateLinearTrend(fl.map((f) => f.teammatesFlashed)) * 10000) / 10000;
    }

    return trends;
  }

  private calculateMilestones(career: PlayerCareer): CareerMilestones {
    const milestones = this.emptyMilestones();

    if (career.performanceHistory.length === 0) {
      return milestones;
    }

    const perf = career.performanceHistory;

    // Best/worst KD
    const bestKdMatch = perf.reduce((best, p) => (p.kd > best.kd ? p : best), perf[0]);
    const worstKdMatch = perf.reduce((worst, p) => (p.kd < worst.kd ? p : worst), perf[0]);

    milestones.bestKdMatch = bestKdMatch.matchId;
    milestones.bestKdValue = bestKdMatch.kd;
    milestones.worstKdMatch = worstKdMatch.matchId;
    milestones.worstKdValue = worstKdMatch.kd;

    // Highest kills
    const highestKills = perf.reduce(
      (best, p) => (p.kills > best.kills ? p : best),
      perf[0],
    );
    milestones.highestKillsMatch = highestKills.matchId;
    milestones.highestKillsValue = highestKills.kills;

    // Streaks
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let tempStreak = 0;
    let tempType: "WIN" | "LOSS" | "" = "";

    for (const p of perf) {
      if (p.result === "WIN") {
        if (tempType === "WIN") {
          tempStreak++;
        } else {
          tempStreak = 1;
          tempType = "WIN";
        }
        maxWinStreak = Math.max(maxWinStreak, tempStreak);
      } else if (p.result === "LOSS") {
        if (tempType === "LOSS") {
          tempStreak++;
        } else {
          tempStreak = 1;
          tempType = "LOSS";
        }
        maxLossStreak = Math.max(maxLossStreak, tempStreak);
      } else {
        tempStreak = 0;
        tempType = "";
      }
    }

    milestones.longestWinStreak = maxWinStreak;
    milestones.longestLossStreak = maxLossStreak;
    milestones.currentStreak = tempType === "WIN" ? tempStreak : -tempStreak;
    milestones.currentStreakType = tempType;

    // Most toxic match
    if (career.sentimentHistory.length > 0) {
      const mostToxic = career.sentimentHistory.reduce(
        (worst, s) => (s.toxicityScore > worst.toxicityScore ? s : worst),
        career.sentimentHistory[0],
      );
      milestones.mostToxicMatch = mostToxic.matchId;
      milestones.mostToxicValue = mostToxic.toxicityScore;
    }

    // Best flash match
    if (career.flashHistory.length > 0) {
      const bestFlash = career.flashHistory.reduce(
        (best, f) => (f.enemiesFlashed > best.enemiesFlashed ? f : best),
        career.flashHistory[0],
      );
      milestones.bestFlashMatch = bestFlash.matchId;
      milestones.bestFlashValue = bestFlash.enemiesFlashed;
    }

    return milestones;
  }

  private calculateRecentForm(career: PlayerCareer, window: number = 5): RecentForm {
    const form = this.emptyRecentForm();
    form.matchesAnalyzed = window;

    if (career.performanceHistory.length < window) {
      return form;
    }

    const recent = career.performanceHistory.slice(-window);
    const avg = career.careerAvg;

    // Recent stats
    const recentKills = recent.reduce((sum, p) => sum + p.kills, 0);
    const recentDeaths = recent.reduce((sum, p) => sum + p.deaths, 0);
    const recentWins = recent.filter((p) => p.result === "WIN").length;

    form.recentKd =
      recentDeaths > 0
        ? Math.round((recentKills / recentDeaths) * 100) / 100
        : recentKills;
    form.careerKd = avg.kd;
    form.kdDiff = Math.round((form.recentKd - form.careerKd) * 100) / 100;

    form.recentAdr = Math.round(mean(recent.map((p) => p.adr)) * 10) / 10;
    form.careerAdr = avg.adr;
    form.adrDiff = Math.round((form.recentAdr - form.careerAdr) * 10) / 10;

    form.recentWinRate = Math.round((recentWins / window) * 1000) / 10;
    form.careerWinRate = avg.winRate;
    form.winRateDiff = Math.round((form.recentWinRate - form.careerWinRate) * 10) / 10;

    // Determine form rating
    let positiveIndicators = 0;

    if (form.kdDiff > 0.1) positiveIndicators++;
    else if (form.kdDiff < -0.1) positiveIndicators--;

    if (form.adrDiff > 5) positiveIndicators++;
    else if (form.adrDiff < -5) positiveIndicators--;

    if (form.winRateDiff > 10) positiveIndicators++;
    else if (form.winRateDiff < -10) positiveIndicators--;

    if (positiveIndicators >= 2) {
      form.formRating = "HOT";
    } else if (positiveIndicators <= -2) {
      form.formRating = "COLD";
    } else {
      form.formRating = "AVERAGE";
    }

    return form;
  }

  private calculateMapStats(career: PlayerCareer): MapStats[] {
    const mapData = new Map<
      string,
      {
        matches: number;
        wins: number;
        losses: number;
        ties: number;
        totalKills: number;
        totalDeaths: number;
        totalAdr: number;
      }
    >();

    for (const perf of career.performanceHistory) {
      const map = perf.map;

      if (!mapData.has(map)) {
        mapData.set(map, {
          matches: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          totalKills: 0,
          totalDeaths: 0,
          totalAdr: 0,
        });
      }

      const stats = mapData.get(map)!;
      stats.matches++;
      stats.totalKills += perf.kills;
      stats.totalDeaths += perf.deaths;
      stats.totalAdr += perf.adr;

      if (perf.result === "WIN") stats.wins++;
      else if (perf.result === "LOSS") stats.losses++;
      else stats.ties++;
    }

    const mapStats: MapStats[] = [];

    for (const [map, stats] of mapData) {
      const n = stats.matches;
      mapStats.push({
        map,
        matches: n,
        wins: stats.wins,
        losses: stats.losses,
        ties: stats.ties,
        avgKills: Math.round((stats.totalKills / n) * 10) / 10,
        avgDeaths: Math.round((stats.totalDeaths / n) * 10) / 10,
        avgAdr: Math.round((stats.totalAdr / n) * 10) / 10,
        winRate: Math.round((stats.wins / n) * 1000) / 10,
        kd:
          stats.totalDeaths > 0
            ? Math.round((stats.totalKills / stats.totalDeaths) * 100) / 100
            : stats.totalKills,
      });
    }

    return mapStats;
  }

  // Helper methods to create empty default objects
  private emptyTrends(): CareerTrends {
    return {
      kdTrend: 0,
      adrTrend: 0,
      winRateTrend: 0,
      headshotTrend: 0,
      toxicityTrend: 0,
      flashEfficiencyTrend: 0,
      teamFlashTrend: 0,
    };
  }

  private emptyAverages(): CareerAverages {
    return {
      kd: 0,
      adr: 0,
      winRate: 0,
      headshotPct: 0,
      killsPerMatch: 0,
      deathsPerMatch: 0,
      mvpsPerMatch: 0,
      toxicity: 0,
      messagesPerMatch: 0,
      enemiesFlashedPerMatch: 0,
      teammatesFlashedPerMatch: 0,
      flashEfficiency: 0,
    };
  }

  private emptyMilestones(): CareerMilestones {
    return {
      bestKdMatch: null,
      bestKdValue: 0,
      worstKdMatch: null,
      worstKdValue: 999,
      highestKillsMatch: null,
      highestKillsValue: 0,
      mostToxicMatch: null,
      mostToxicValue: 0,
      bestFlashMatch: null,
      bestFlashValue: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      currentStreak: 0,
      currentStreakType: "",
    };
  }

  private emptyRecentForm(): RecentForm {
    return {
      matchesAnalyzed: 5,
      recentKd: 0,
      careerKd: 0,
      kdDiff: 0,
      recentAdr: 0,
      careerAdr: 0,
      adrDiff: 0,
      recentWinRate: 0,
      careerWinRate: 0,
      winRateDiff: 0,
      formRating: "AVERAGE",
    };
  }
}

export const careerService = new CareerService();
