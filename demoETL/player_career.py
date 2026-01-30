"""
Player Career Tracking
======================
Tracks player statistics over time to analyze trends and patterns.

Aggregates data from multiple matches to build career profiles including:
- Performance trends (K/D, ADR, win rate)
- Sentiment trends (toxicity, positivity)
- Flash effectiveness trends
- Milestone tracking

Usage:
    from player_career import PlayerCareerTracker

    tracker = PlayerCareerTracker()
    career = tracker.get_player_career("76561198012345678")
    print(f"K/D Trend: {career.trends.kd_trend}")
"""

import json
import logging
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
from statistics import mean, stdev
import math

from file_storage import FileStorage

logger = logging.getLogger(__name__)


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class MatchPerformance:
    """Performance stats for a single match."""
    match_id: str
    date: str
    map: str
    kills: int
    deaths: int
    assists: int
    adr: float
    headshot_pct: float
    mvps: int
    score: int
    result: str  # WIN, LOSS, TIE
    kd: float


@dataclass
class MatchSentiment:
    """Sentiment stats for a single match."""
    match_id: str
    date: str
    message_count: int
    avg_positive: float
    avg_negative: float
    avg_neutral: float
    toxicity_score: float
    dominant_sentiment: str


@dataclass
class MatchFlashStats:
    """Flash stats for a single match."""
    match_id: str
    date: str
    enemies_flashed: int
    enemy_blind_duration: float
    teammates_flashed: int
    team_blind_duration: float
    self_flashes: int
    flashes_thrown: int
    efficiency: float  # enemies_flashed / flashes_thrown


@dataclass
class CareerTrends:
    """Calculated trend slopes for career metrics."""
    kd_trend: float = 0.0           # + improving, - declining
    adr_trend: float = 0.0
    win_rate_trend: float = 0.0
    headshot_trend: float = 0.0
    toxicity_trend: float = 0.0     # + getting more toxic, - improving
    flash_efficiency_trend: float = 0.0
    team_flash_trend: float = 0.0   # - is good (fewer team flashes)


@dataclass
class CareerAverages:
    """Lifetime career averages."""
    kd: float = 0.0
    adr: float = 0.0
    win_rate: float = 0.0
    headshot_pct: float = 0.0
    kills_per_match: float = 0.0
    deaths_per_match: float = 0.0
    mvps_per_match: float = 0.0
    toxicity: float = 0.0
    messages_per_match: float = 0.0
    enemies_flashed_per_match: float = 0.0
    teammates_flashed_per_match: float = 0.0
    flash_efficiency: float = 0.0


@dataclass
class CareerMilestones:
    """Notable career achievements and records."""
    best_kd_match: Optional[str] = None
    best_kd_value: float = 0.0
    worst_kd_match: Optional[str] = None
    worst_kd_value: float = 999.0
    highest_kills_match: Optional[str] = None
    highest_kills_value: int = 0
    most_toxic_match: Optional[str] = None
    most_toxic_value: float = 0.0
    best_flash_match: Optional[str] = None
    best_flash_value: int = 0
    longest_win_streak: int = 0
    longest_loss_streak: int = 0
    current_streak: int = 0  # + for wins, - for losses
    current_streak_type: str = ""  # "WIN" or "LOSS"


@dataclass
class RecentForm:
    """Recent performance vs career average."""
    matches_analyzed: int = 5
    recent_kd: float = 0.0
    career_kd: float = 0.0
    kd_diff: float = 0.0  # recent - career (+ = above average)
    recent_adr: float = 0.0
    career_adr: float = 0.0
    adr_diff: float = 0.0
    recent_win_rate: float = 0.0
    career_win_rate: float = 0.0
    win_rate_diff: float = 0.0
    form_rating: str = "AVERAGE"  # "HOT", "AVERAGE", "COLD"


@dataclass
class PlayerCareer:
    """Complete career profile for a player."""
    steam_id: str
    player_name: str
    first_match_date: Optional[str] = None
    last_match_date: Optional[str] = None
    total_matches: int = 0

    # Timelines
    performance_history: List[MatchPerformance] = field(default_factory=list)
    sentiment_history: List[MatchSentiment] = field(default_factory=list)
    flash_history: List[MatchFlashStats] = field(default_factory=list)

    # Aggregations
    trends: CareerTrends = field(default_factory=CareerTrends)
    career_avg: CareerAverages = field(default_factory=CareerAverages)
    milestones: CareerMilestones = field(default_factory=CareerMilestones)
    recent_form: RecentForm = field(default_factory=RecentForm)

    # Map-specific stats
    map_stats: Dict[str, Dict[str, Any]] = field(default_factory=dict)


# =============================================================================
# TREND CALCULATION
# =============================================================================

def calculate_linear_trend(values: List[float]) -> float:
    """
    Calculate the slope of a linear regression line.

    Returns the trend as slope per match:
    - Positive = increasing over time
    - Negative = decreasing over time
    - Near zero = stable
    """
    if len(values) < 2:
        return 0.0

    n = len(values)
    x = list(range(n))

    # Calculate means
    x_mean = sum(x) / n
    y_mean = sum(values) / n

    # Calculate slope: sum((x - x_mean)(y - y_mean)) / sum((x - x_mean)^2)
    numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return 0.0

    return numerator / denominator


def calculate_rolling_average(values: List[float], window: int = 5) -> List[float]:
    """Calculate rolling average for smoothing trends."""
    if len(values) < window:
        return values

    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        result.append(mean(values[start:i + 1]))

    return result


# =============================================================================
# MAIN TRACKER CLASS
# =============================================================================

class PlayerCareerTracker:
    """
    Builds and manages player career profiles from match data.
    """

    def __init__(self, storage: FileStorage = None):
        self.storage = storage or FileStorage()
        self._careers_cache: Dict[str, PlayerCareer] = {}

    def get_player_career(
        self,
        steam_id: str,
        include_sentiment: bool = True,
        include_flashes: bool = True
    ) -> PlayerCareer:
        """
        Build a complete career profile for a player.

        Args:
            steam_id: Player's Steam ID
            include_sentiment: Include chat sentiment analysis
            include_flashes: Include flash statistics

        Returns:
            PlayerCareer with all historical data and calculated trends
        """
        # Get all matches for this player
        player_matches = self.storage.get_player_matches(steam_id=steam_id)

        if not player_matches:
            logger.warning(f"No matches found for player {steam_id}")
            return PlayerCareer(steam_id=steam_id, player_name="Unknown")

        # Get player name from most recent match
        player_name = player_matches[-1].get('name', 'Unknown')

        # Initialize career
        career = PlayerCareer(
            steam_id=steam_id,
            player_name=player_name,
            total_matches=len(player_matches)
        )

        # Build performance history
        career.performance_history = self._build_performance_history(player_matches)

        if career.performance_history:
            career.first_match_date = career.performance_history[0].date
            career.last_match_date = career.performance_history[-1].date

        # Build sentiment history
        if include_sentiment:
            career.sentiment_history = self._build_sentiment_history(steam_id)

        # Build flash history
        if include_flashes:
            career.flash_history = self._build_flash_history(steam_id)

        # Calculate aggregations
        career.career_avg = self._calculate_career_averages(career)
        career.trends = self._calculate_trends(career)
        career.milestones = self._calculate_milestones(career)
        career.recent_form = self._calculate_recent_form(career)
        career.map_stats = self._calculate_map_stats(career)

        return career

    def _build_performance_history(
        self,
        player_matches: List[Dict[str, Any]]
    ) -> List[MatchPerformance]:
        """Build chronological performance history."""
        # Get match dates for sorting
        matches_table = self.storage.get_all_matches()
        match_dates = {m['match_id']: m.get('played_at', m.get('created_at', '')) for m in matches_table}
        match_maps = {m['match_id']: m.get('map', 'unknown') for m in matches_table}

        history = []
        for pm in player_matches:
            match_id = pm.get('match_id')
            kills = pm.get('kills', 0)
            deaths = pm.get('deaths', 0)
            headshots = pm.get('headshots', 0)

            kd = kills / deaths if deaths > 0 else kills
            hs_pct = (headshots / kills * 100) if kills > 0 else 0

            history.append(MatchPerformance(
                match_id=match_id,
                date=match_dates.get(match_id, ''),
                map=match_maps.get(match_id, 'unknown'),
                kills=kills,
                deaths=deaths,
                assists=pm.get('assists', 0),
                adr=pm.get('adr', 0),
                headshot_pct=round(hs_pct, 1),
                mvps=pm.get('mvps', 0),
                score=pm.get('score', 0),
                result=pm.get('result', 'TIE'),
                kd=round(kd, 2)
            ))

        # Sort by date
        history.sort(key=lambda x: x.date)
        return history

    def _build_sentiment_history(self, steam_id: str) -> List[MatchSentiment]:
        """Build sentiment history from chat messages."""
        # Import here to avoid circular dependency
        try:
            from chat_sentiment import ChatSentimentAnalyzer
        except ImportError:
            logger.warning("chat_sentiment module not available")
            return []

        matches_table = self.storage.get_all_matches()
        match_dates = {m['match_id']: m.get('played_at', m.get('created_at', '')) for m in matches_table}

        history = []
        analyzer = ChatSentimentAnalyzer(use_aws=False)  # Use fallback for speed

        # Get unique match IDs this player participated in
        player_matches = self.storage.get_player_matches(steam_id=steam_id)
        match_ids = set(pm['match_id'] for pm in player_matches)

        for match_id in match_ids:
            # Get this player's messages in this match
            all_messages = self.storage.get_chat_messages(match_id=match_id)
            player_messages = [m for m in all_messages if m.get('steam_id') == steam_id]

            if not player_messages:
                continue

            # Analyze sentiment for each message
            sentiments = []
            for msg in player_messages:
                sentiment = analyzer.analyze_sentiment(msg.get('message', ''))
                sentiments.append(sentiment)

            if sentiments:
                avg_positive = mean(s.positive for s in sentiments)
                avg_negative = mean(s.negative for s in sentiments)
                avg_neutral = mean(s.neutral for s in sentiments)
                toxic_count = sum(1 for s in sentiments if s.negative > 0.4)
                toxicity = toxic_count / len(sentiments) * 100

                # Determine dominant
                scores = {'POSITIVE': avg_positive, 'NEGATIVE': avg_negative, 'NEUTRAL': avg_neutral}
                dominant = max(scores, key=scores.get)

                history.append(MatchSentiment(
                    match_id=match_id,
                    date=match_dates.get(match_id, ''),
                    message_count=len(player_messages),
                    avg_positive=round(avg_positive, 3),
                    avg_negative=round(avg_negative, 3),
                    avg_neutral=round(avg_neutral, 3),
                    toxicity_score=round(toxicity, 1),
                    dominant_sentiment=dominant
                ))

        history.sort(key=lambda x: x.date)
        return history

    def _build_flash_history(self, steam_id: str) -> List[MatchFlashStats]:
        """Build flash effectiveness history."""
        flash_records = self.storage.get_flash_stats(steam_id=steam_id)

        if not flash_records:
            return []

        matches_table = self.storage.get_all_matches()
        match_dates = {m['match_id']: m.get('played_at', m.get('created_at', '')) for m in matches_table}

        history = []
        for fr in flash_records:
            enemies = fr.get('enemies_flashed', 0)
            thrown = fr.get('flashes_thrown', 0)
            efficiency = enemies / thrown if thrown > 0 else 0

            history.append(MatchFlashStats(
                match_id=fr.get('match_id'),
                date=match_dates.get(fr.get('match_id'), ''),
                enemies_flashed=enemies,
                enemy_blind_duration=fr.get('enemy_blind_duration', 0),
                teammates_flashed=fr.get('teammates_flashed', 0),
                team_blind_duration=fr.get('team_blind_duration', 0),
                self_flashes=fr.get('self_flashes', 0),
                flashes_thrown=thrown,
                efficiency=round(efficiency, 2)
            ))

        history.sort(key=lambda x: x.date)
        return history

    def _calculate_career_averages(self, career: PlayerCareer) -> CareerAverages:
        """Calculate lifetime career averages."""
        avg = CareerAverages()

        if not career.performance_history:
            return avg

        perf = career.performance_history
        n = len(perf)

        total_kills = sum(p.kills for p in perf)
        total_deaths = sum(p.deaths for p in perf)
        wins = sum(1 for p in perf if p.result == 'WIN')

        avg.kd = round(total_kills / total_deaths, 2) if total_deaths > 0 else total_kills
        avg.adr = round(mean(p.adr for p in perf), 1)
        avg.win_rate = round(wins / n * 100, 1)
        avg.headshot_pct = round(mean(p.headshot_pct for p in perf), 1)
        avg.kills_per_match = round(total_kills / n, 1)
        avg.deaths_per_match = round(total_deaths / n, 1)
        avg.mvps_per_match = round(sum(p.mvps for p in perf) / n, 1)

        # Sentiment averages
        if career.sentiment_history:
            sent = career.sentiment_history
            avg.toxicity = round(mean(s.toxicity_score for s in sent), 1)
            avg.messages_per_match = round(sum(s.message_count for s in sent) / len(sent), 1)

        # Flash averages
        if career.flash_history:
            fl = career.flash_history
            avg.enemies_flashed_per_match = round(mean(f.enemies_flashed for f in fl), 1)
            avg.teammates_flashed_per_match = round(mean(f.teammates_flashed for f in fl), 1)
            total_enemies = sum(f.enemies_flashed for f in fl)
            total_thrown = sum(f.flashes_thrown for f in fl)
            avg.flash_efficiency = round(total_enemies / total_thrown, 2) if total_thrown > 0 else 0

        return avg

    def _calculate_trends(self, career: PlayerCareer) -> CareerTrends:
        """Calculate trend slopes for all metrics."""
        trends = CareerTrends()

        if len(career.performance_history) >= 3:
            perf = career.performance_history
            trends.kd_trend = round(calculate_linear_trend([p.kd for p in perf]), 4)
            trends.adr_trend = round(calculate_linear_trend([p.adr for p in perf]), 4)
            trends.headshot_trend = round(calculate_linear_trend([p.headshot_pct for p in perf]), 4)

            # Win rate trend (convert to 1/0)
            win_values = [1 if p.result == 'WIN' else 0 for p in perf]
            trends.win_rate_trend = round(calculate_linear_trend(win_values), 4)

        if len(career.sentiment_history) >= 3:
            sent = career.sentiment_history
            trends.toxicity_trend = round(calculate_linear_trend([s.toxicity_score for s in sent]), 4)

        if len(career.flash_history) >= 3:
            fl = career.flash_history
            trends.flash_efficiency_trend = round(calculate_linear_trend([f.efficiency for f in fl]), 4)
            trends.team_flash_trend = round(calculate_linear_trend([f.teammates_flashed for f in fl]), 4)

        return trends

    def _calculate_milestones(self, career: PlayerCareer) -> CareerMilestones:
        """Calculate career milestones and records."""
        milestones = CareerMilestones()

        if not career.performance_history:
            return milestones

        perf = career.performance_history

        # Best/worst KD
        best_kd_match = max(perf, key=lambda p: p.kd)
        worst_kd_match = min(perf, key=lambda p: p.kd)
        milestones.best_kd_match = best_kd_match.match_id
        milestones.best_kd_value = best_kd_match.kd
        milestones.worst_kd_match = worst_kd_match.match_id
        milestones.worst_kd_value = worst_kd_match.kd

        # Highest kills
        highest_kills = max(perf, key=lambda p: p.kills)
        milestones.highest_kills_match = highest_kills.match_id
        milestones.highest_kills_value = highest_kills.kills

        # Streaks
        current_streak = 0
        current_type = ""
        max_win_streak = 0
        max_loss_streak = 0
        temp_streak = 0
        temp_type = ""

        for p in perf:
            if p.result == "WIN":
                if temp_type == "WIN":
                    temp_streak += 1
                else:
                    temp_streak = 1
                    temp_type = "WIN"
                max_win_streak = max(max_win_streak, temp_streak)
            elif p.result == "LOSS":
                if temp_type == "LOSS":
                    temp_streak += 1
                else:
                    temp_streak = 1
                    temp_type = "LOSS"
                max_loss_streak = max(max_loss_streak, temp_streak)
            else:
                temp_streak = 0
                temp_type = ""

        milestones.longest_win_streak = max_win_streak
        milestones.longest_loss_streak = max_loss_streak
        milestones.current_streak = temp_streak if temp_type == "WIN" else -temp_streak
        milestones.current_streak_type = temp_type

        # Most toxic match
        if career.sentiment_history:
            most_toxic = max(career.sentiment_history, key=lambda s: s.toxicity_score)
            milestones.most_toxic_match = most_toxic.match_id
            milestones.most_toxic_value = most_toxic.toxicity_score

        # Best flash match
        if career.flash_history:
            best_flash = max(career.flash_history, key=lambda f: f.enemies_flashed)
            milestones.best_flash_match = best_flash.match_id
            milestones.best_flash_value = best_flash.enemies_flashed

        return milestones

    def _calculate_recent_form(self, career: PlayerCareer, window: int = 5) -> RecentForm:
        """Compare recent performance to career average."""
        form = RecentForm(matches_analyzed=window)

        if len(career.performance_history) < window:
            return form

        recent = career.performance_history[-window:]
        avg = career.career_avg

        # Recent stats
        recent_kills = sum(p.kills for p in recent)
        recent_deaths = sum(p.deaths for p in recent)
        recent_wins = sum(1 for p in recent if p.result == 'WIN')

        form.recent_kd = round(recent_kills / recent_deaths, 2) if recent_deaths > 0 else recent_kills
        form.career_kd = avg.kd
        form.kd_diff = round(form.recent_kd - form.career_kd, 2)

        form.recent_adr = round(mean(p.adr for p in recent), 1)
        form.career_adr = avg.adr
        form.adr_diff = round(form.recent_adr - form.career_adr, 1)

        form.recent_win_rate = round(recent_wins / window * 100, 1)
        form.career_win_rate = avg.win_rate
        form.win_rate_diff = round(form.recent_win_rate - form.career_win_rate, 1)

        # Determine form rating
        positive_indicators = 0
        if form.kd_diff > 0.1:
            positive_indicators += 1
        elif form.kd_diff < -0.1:
            positive_indicators -= 1

        if form.adr_diff > 5:
            positive_indicators += 1
        elif form.adr_diff < -5:
            positive_indicators -= 1

        if form.win_rate_diff > 10:
            positive_indicators += 1
        elif form.win_rate_diff < -10:
            positive_indicators -= 1

        if positive_indicators >= 2:
            form.form_rating = "HOT"
        elif positive_indicators <= -2:
            form.form_rating = "COLD"
        else:
            form.form_rating = "AVERAGE"

        return form

    def _calculate_map_stats(self, career: PlayerCareer) -> Dict[str, Dict[str, Any]]:
        """Calculate per-map statistics."""
        map_stats = {}

        for perf in career.performance_history:
            map_name = perf.map
            if map_name not in map_stats:
                map_stats[map_name] = {
                    'matches': 0,
                    'wins': 0,
                    'losses': 0,
                    'total_kills': 0,
                    'total_deaths': 0,
                    'total_adr': 0,
                }

            stats = map_stats[map_name]
            stats['matches'] += 1
            stats['total_kills'] += perf.kills
            stats['total_deaths'] += perf.deaths
            stats['total_adr'] += perf.adr

            if perf.result == 'WIN':
                stats['wins'] += 1
            elif perf.result == 'LOSS':
                stats['losses'] += 1

        # Calculate averages
        for map_name, stats in map_stats.items():
            n = stats['matches']
            stats['avg_kills'] = round(stats['total_kills'] / n, 1)
            stats['avg_deaths'] = round(stats['total_deaths'] / n, 1)
            stats['avg_adr'] = round(stats['total_adr'] / n, 1)
            stats['win_rate'] = round(stats['wins'] / n * 100, 1)
            stats['kd'] = round(stats['total_kills'] / stats['total_deaths'], 2) if stats['total_deaths'] > 0 else stats['total_kills']

        return map_stats

    def get_all_players(self) -> List[str]:
        """Get list of all player Steam IDs in the database."""
        player_matches = self.storage._read_table('player_matches')
        return list(set(pm.get('steam_id') for pm in player_matches if pm.get('steam_id')))

    def build_all_careers(self) -> Dict[str, PlayerCareer]:
        """Build career profiles for all players."""
        careers = {}
        for steam_id in self.get_all_players():
            careers[steam_id] = self.get_player_career(steam_id)
        return careers


# =============================================================================
# STORAGE
# =============================================================================

def save_career_to_json(career: PlayerCareer, output_path: str):
    """Save a player career to JSON file."""
    data = {
        'steam_id': career.steam_id,
        'player_name': career.player_name,
        'first_match_date': career.first_match_date,
        'last_match_date': career.last_match_date,
        'total_matches': career.total_matches,
        'career_avg': asdict(career.career_avg),
        'trends': asdict(career.trends),
        'milestones': asdict(career.milestones),
        'recent_form': asdict(career.recent_form),
        'map_stats': career.map_stats,
        'performance_history': [asdict(p) for p in career.performance_history],
        'sentiment_history': [asdict(s) for s in career.sentiment_history],
        'flash_history': [asdict(f) for f in career.flash_history],
    }

    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    logger.info(f"Saved career to {output_path}")


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    tracker = PlayerCareerTracker()

    if len(sys.argv) > 1:
        steam_id = sys.argv[1]
    else:
        # Get first player
        players = tracker.get_all_players()
        if not players:
            print("No players found in database")
            sys.exit(1)
        steam_id = players[0]

    print(f"\nBuilding career profile for: {steam_id}\n")

    career = tracker.get_player_career(steam_id)

    print(f"Player: {career.player_name}")
    print(f"Total Matches: {career.total_matches}")
    print(f"First Match: {career.first_match_date}")
    print(f"Last Match: {career.last_match_date}")

    print(f"\n--- Career Averages ---")
    print(f"K/D: {career.career_avg.kd}")
    print(f"ADR: {career.career_avg.adr}")
    print(f"Win Rate: {career.career_avg.win_rate}%")
    print(f"Headshot %: {career.career_avg.headshot_pct}%")
    print(f"Toxicity: {career.career_avg.toxicity}%")
    print(f"Enemies Flashed/Match: {career.career_avg.enemies_flashed_per_match}")
    print(f"Teammates Flashed/Match: {career.career_avg.teammates_flashed_per_match}")

    print(f"\n--- Trends (per match slope) ---")
    print(f"K/D Trend: {career.trends.kd_trend:+.4f}")
    print(f"ADR Trend: {career.trends.adr_trend:+.4f}")
    print(f"Toxicity Trend: {career.trends.toxicity_trend:+.4f}")
    print(f"Flash Efficiency Trend: {career.trends.flash_efficiency_trend:+.4f}")
    print(f"Team Flash Trend: {career.trends.team_flash_trend:+.4f}")

    print(f"\n--- Milestones ---")
    print(f"Best K/D: {career.milestones.best_kd_value} (match {career.milestones.best_kd_match})")
    print(f"Highest Kills: {career.milestones.highest_kills_value}")
    print(f"Longest Win Streak: {career.milestones.longest_win_streak}")
    print(f"Longest Loss Streak: {career.milestones.longest_loss_streak}")

    print(f"\n--- Recent Form (last 5 matches) ---")
    print(f"Form Rating: {career.recent_form.form_rating}")
    print(f"Recent K/D: {career.recent_form.recent_kd} (career: {career.recent_form.career_kd}, diff: {career.recent_form.kd_diff:+.2f})")
    print(f"Recent ADR: {career.recent_form.recent_adr} (career: {career.recent_form.career_adr}, diff: {career.recent_form.adr_diff:+.1f})")

    print(f"\n--- Map Stats ---")
    for map_name, stats in career.map_stats.items():
        print(f"{map_name}: {stats['matches']} matches, {stats['win_rate']}% WR, {stats['kd']} K/D")

    # Save to file
    output_path = f"./career_{steam_id}.json"
    save_career_to_json(career, output_path)
    print(f"\nSaved to: {output_path}")
