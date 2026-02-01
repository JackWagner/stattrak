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
import { getMatch, getMatchRounds, getMatchFlashStats, getMatchDamageStats } from '../services/api';
import type { MatchDetails, Round, PlayerMatchStats, MatchFlashSummary, MatchDamageSummary } from '../types';

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
  const [flashStats, setFlashStats] = useState<MatchFlashSummary | null>(null);
  const [damageStats, setDamageStats] = useState<MatchDamageSummary | null>(null);
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

        // Fetch critical match data (match details and rounds) in parallel
        const [matchData, roundsData] = await Promise.all([
          getMatch(matchId),
          getMatchRounds(matchId),
        ]);

        setMatch(matchData);
        setRounds(roundsData);

        // Fetch optional stats separately - these endpoints may not exist yet
        // and should not block the main page from loading
        try {
          const flashData = await getMatchFlashStats(matchId);
          setFlashStats(flashData);
        } catch {
          // Flash stats endpoint may not exist - that's okay
          setFlashStats(null);
        }

        try {
          const damageData = await getMatchDamageStats(matchId);
          setDamageStats(damageData);
        } catch {
          // Damage stats endpoint may not exist - that's okay
          setDamageStats(null);
        }
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

      {/* Team Damage Section */}
      {damageStats && damageStats.players && damageStats.players.length > 0 && (() => {
        // Helper to normalize team values (could be "CT", "T", "ct", 2, 3, etc.)
        const normalizeTeam = (team: unknown): string => {
          const t = String(team).toUpperCase();
          if (t === 'CT' || t === '3') return 'CT';
          if (t === 'T' || t === '2') return 'T';
          return t;
        };

        const ctDamage = damageStats.players.filter((p) => normalizeTeam(p.team) === 'CT');
        const tDamage = damageStats.players.filter((p) => normalizeTeam(p.team) === 'T');

        // If team filtering didn't work, show all players in one table
        const hasTeamData = ctDamage.length > 0 || tDamage.length > 0;

        const renderDamageTable = (players: typeof damageStats.players, teamName: string, teamClass: string) => {
          if (players.length === 0) return null;
          return (
            <div className={`team-scoreboard ${teamClass}-team`}>
              <h3 className={`team-title ${teamClass}`}>{teamName}</h3>
              <table className="scoreboard-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Team DMG</th>
                    <th>TKs</th>
                    <th>Total DMG</th>
                  </tr>
                </thead>
                <tbody>
                  {[...players]
                    .sort((a, b) => (b.teamDamage ?? 0) - (a.teamDamage ?? 0))
                    .map((player) => (
                      <tr key={player.steamId}>
                        <td>
                          <Link to={`/players/${player.steamId}`} className="player-link">
                            {player.name}
                          </Link>
                        </td>
                        <td>{player.teamDamage ?? 0}</td>
                        <td>{player.teamKills ?? 0}</td>
                        <td>{player.totalDamage ?? 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          );
        };

        return (
          <section className="section">
            <h2>Team Damage</h2>
            {hasTeamData ? (
              <>
                {renderDamageTable(ctDamage, 'Counter-Terrorists', 'ct')}
                {renderDamageTable(tDamage, 'Terrorists', 't')}
              </>
            ) : (
              renderDamageTable(damageStats.players, 'All Players', 'ct')
            )}
          </section>
        );
      })()}

      {/* Flash Statistics Section */}
      {flashStats && flashStats.players && flashStats.players.length > 0 && (() => {
        // Helper to normalize team values (could be "CT", "T", "ct", 2, 3, etc.)
        const normalizeTeam = (team: unknown): string => {
          const t = String(team).toUpperCase();
          if (t === 'CT' || t === '3') return 'CT';
          if (t === 'T' || t === '2') return 'T';
          return t;
        };

        const ctFlash = flashStats.players.filter((p) => normalizeTeam(p.team) === 'CT');
        const tFlash = flashStats.players.filter((p) => normalizeTeam(p.team) === 'T');

        // If team filtering didn't work, show all players in one table
        const hasTeamData = ctFlash.length > 0 || tFlash.length > 0;

        const renderFlashTable = (players: typeof flashStats.players, teamName: string, teamClass: string) => {
          if (players.length === 0) return null;
          return (
            <div className={`team-scoreboard ${teamClass}-team`}>
              <h3 className={`team-title ${teamClass}`}>{teamName}</h3>
              <table className="scoreboard-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Enemies</th>
                    <th>Blind</th>
                    <th>Team</th>
                    <th>TBlind</th>
                    <th>Thrown</th>
                  </tr>
                </thead>
                <tbody>
                  {[...players]
                    .sort((a, b) => (b.enemiesFlashed ?? 0) - (a.enemiesFlashed ?? 0))
                    .map((player) => (
                      <tr key={player.steamId}>
                        <td>
                          <Link to={`/players/${player.steamId}`} className="player-link">
                            {player.name}
                          </Link>
                        </td>
                        <td>{player.enemiesFlashed ?? 0}</td>
                        <td>{(player.enemyBlindDuration ?? 0).toFixed(1)}s</td>
                        <td>{player.teammatesFlashed ?? 0}</td>
                        <td>{(player.teamBlindDuration ?? 0).toFixed(1)}s</td>
                        <td>{player.flashesThrown ?? 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          );
        };

        return (
          <section className="section">
            <h2>Flash Statistics</h2>
            {hasTeamData ? (
              <>
                {renderFlashTable(ctFlash, 'Counter-Terrorists', 'ct')}
                {renderFlashTable(tFlash, 'Terrorists', 't')}
              </>
            ) : (
              renderFlashTable(flashStats.players, 'All Players', 'ct')
            )}
          </section>
        );
      })()}

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
