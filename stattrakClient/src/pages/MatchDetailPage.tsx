// =============================================================================
// MATCH DETAIL PAGE - Shows full details for a single match
// =============================================================================
// This page displays:
// - Match overview (map, score, date)
// - Scoreboard with all player stats
// - Round-by-round breakdown
// =============================================================================

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout, Loading, ErrorMessage } from '../components';
import { getMatch, getMatchRounds } from '../services/api';
import type { MatchDetails, Round, PlayerMatchStats } from '../types';

// -----------------------------------------------------------------------------
// The MatchDetailPage Component
// -----------------------------------------------------------------------------
function MatchDetailPage() {
  // ---------------------------------------------------------------------------
  // URL PARAMS
  // ---------------------------------------------------------------------------
  // useParams lets us read dynamic parts of the URL
  // For route "/matches/:matchId", we can read the matchId value
  // ---------------------------------------------------------------------------
  const { matchId } = useParams<{ matchId: string }>();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // EFFECT - Fetch match details when matchId changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function fetchMatchDetails() {
      // If no matchId in URL, don't fetch
      if (!matchId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch match details and rounds in parallel
        // Promise.all waits for both to complete before continuing
        const [matchData, roundsData] = await Promise.all([
          getMatch(matchId),
          getMatchRounds(matchId),
        ]);

        setMatch(matchData);
        setRounds(roundsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load match');
      } finally {
        setLoading(false);
      }
    }

    fetchMatchDetails();
  }, [matchId]);

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format duration (seconds to minutes:seconds)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Split players into CT and T teams
  const splitByTeam = (players: PlayerMatchStats[]) => {
    const ct = players.filter((p) => p.team === 'CT');
    const t = players.filter((p) => p.team === 'T');
    return { ct, t };
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Loading state
  if (loading) {
    return (
      <Layout>
        <Loading message="Loading match details..." />
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <ErrorMessage message={error} />
      </Layout>
    );
  }

  // No match found
  if (!match) {
    return (
      <Layout>
        <ErrorMessage message="Match not found" />
      </Layout>
    );
  }

  // Split players by team for the scoreboard
  const { ct, t } = splitByTeam(match.players);

  return (
    <Layout>
      {/* Match Header */}
      <div className="match-detail-header">
        <h1>{match.map}</h1>
        <p className="match-date">{formatDate(match.playedAt)}</p>

        {/* Score display */}
        <div className="match-final-score">
          <div className="team-score ct-side">
            <span className="team-label">CT</span>
            <span className="score">{match.ctScore}</span>
          </div>
          <div className="score-separator">vs</div>
          <div className="team-score t-side">
            <span className="score">{match.tScore}</span>
            <span className="team-label">T</span>
          </div>
        </div>

        {/* Match duration */}
        <p className="match-duration">
          Duration: {formatDuration(match.duration)}
        </p>
      </div>

      {/* Scoreboard Section */}
      <section className="section">
        <h2>Scoreboard</h2>

        {/* CT Team */}
        <div className="team-scoreboard ct-team">
          <h3 className="team-title ct">Counter-Terrorists ({match.ctScore})</h3>
          <table className="scoreboard-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>K</th>
                <th>D</th>
                <th>A</th>
                <th>ADR</th>
                <th>HS%</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {ct.map((player) => (
                <tr key={player.steamId}>
                  <td>
                    {/* Player name links to their profile */}
                    <Link to={`/players/${player.steamId}`} className="player-link">
                      {player.name}
                    </Link>
                  </td>
                  <td>{player.kills}</td>
                  <td>{player.deaths}</td>
                  <td>{player.assists}</td>
                  <td>{player.adr.toFixed(1)}</td>
                  <td>{player.headshotPercentage.toFixed(0)}%</td>
                  <td>{player.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* T Team */}
        <div className="team-scoreboard t-team">
          <h3 className="team-title t">Terrorists ({match.tScore})</h3>
          <table className="scoreboard-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>K</th>
                <th>D</th>
                <th>A</th>
                <th>ADR</th>
                <th>HS%</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {t.map((player) => (
                <tr key={player.steamId}>
                  <td>
                    <Link to={`/players/${player.steamId}`} className="player-link">
                      {player.name}
                    </Link>
                  </td>
                  <td>{player.kills}</td>
                  <td>{player.deaths}</td>
                  <td>{player.assists}</td>
                  <td>{player.adr.toFixed(1)}</td>
                  <td>{player.headshotPercentage.toFixed(0)}%</td>
                  <td>{player.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Round History Section */}
      {rounds.length > 0 && (
        <section className="section">
          <h2>Round History</h2>
          <div className="rounds-timeline">
            {rounds.map((round) => (
              <div
                key={round.roundNumber}
                className={`round-item ${round.winnerSide.toLowerCase()}-win`}
              >
                <span className="round-number">R{round.roundNumber}</span>
                <span className="round-winner">{round.winnerSide}</span>
                <span className="round-score">
                  {round.ctScore} - {round.tScore}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}

export default MatchDetailPage;
