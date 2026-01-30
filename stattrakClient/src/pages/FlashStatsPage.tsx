/**
 * Flash Stats Page
 * =================
 * Displays flashbang statistics including:
 * - Team flash "Hall of Shame" (players who flash teammates the most)
 * - Enemy flash "Hall of Fame" (players with most effective flashes)
 *
 * This page helps identify:
 * - Players who need to work on their flash timing
 * - Players who are effective utility users
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeamFlashLeaderboard, getEnemyFlashLeaderboard } from '../services/api';
import type { FlashLeaderboardEntry } from '../types';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

// -----------------------------------------------------------------------------
// Component: FlashStatsPage
// -----------------------------------------------------------------------------
export default function FlashStatsPage() {
  // State for team flash leaderboard (hall of shame)
  const [teamFlashers, setTeamFlashers] = useState<FlashLeaderboardEntry[]>([]);
  const [teamFlashLoading, setTeamFlashLoading] = useState(true);
  const [teamFlashError, setTeamFlashError] = useState<string | null>(null);

  // State for enemy flash leaderboard (hall of fame)
  const [enemyFlashers, setEnemyFlashers] = useState<FlashLeaderboardEntry[]>([]);
  const [enemyFlashLoading, setEnemyFlashLoading] = useState(true);
  const [enemyFlashError, setEnemyFlashError] = useState<string | null>(null);

  // State for which tab is active
  const [activeTab, setActiveTab] = useState<'shame' | 'fame'>('shame');

  // Fetch team flash leaderboard on mount
  useEffect(() => {
    async function fetchTeamFlashLeaderboard() {
      try {
        setTeamFlashLoading(true);
        const result = await getTeamFlashLeaderboard(1, 50);
        setTeamFlashers(result.data);
        setTeamFlashError(null);
      } catch (err) {
        setTeamFlashError(err instanceof Error ? err.message : 'Failed to load team flash stats');
      } finally {
        setTeamFlashLoading(false);
      }
    }

    fetchTeamFlashLeaderboard();
  }, []);

  // Fetch enemy flash leaderboard on mount
  useEffect(() => {
    async function fetchEnemyFlashLeaderboard() {
      try {
        setEnemyFlashLoading(true);
        const result = await getEnemyFlashLeaderboard(1, 50);
        setEnemyFlashers(result.data);
        setEnemyFlashError(null);
      } catch (err) {
        setEnemyFlashError(err instanceof Error ? err.message : 'Failed to load enemy flash stats');
      } finally {
        setEnemyFlashLoading(false);
      }
    }

    fetchEnemyFlashLeaderboard();
  }, []);

  return (
    <div className="flash-stats-page">
      <h1>Flash Statistics</h1>
      <p className="page-description">
        Track flashbang effectiveness across all matches. See who's helping their team
        with well-timed flashes... and who's blinding their own teammates.
      </p>

      {/* Tab Navigation */}
      <div className="flash-tabs">
        <button
          className={`flash-tab ${activeTab === 'shame' ? 'active' : ''}`}
          onClick={() => setActiveTab('shame')}
        >
          Hall of Shame
        </button>
        <button
          className={`flash-tab ${activeTab === 'fame' ? 'active' : ''}`}
          onClick={() => setActiveTab('fame')}
        >
          Hall of Fame
        </button>
      </div>

      {/* Hall of Shame - Team Flashers */}
      {activeTab === 'shame' && (
        <div className="flash-leaderboard shame">
          <h2>Team Flash Hall of Shame</h2>
          <p className="leaderboard-description">
            Players ranked by how often they flash their own teammates.
            Higher numbers = more friendly fire with flashbangs.
          </p>

          {teamFlashLoading && <Loading />}
          {teamFlashError && <ErrorMessage message={teamFlashError} />}

          {!teamFlashLoading && !teamFlashError && teamFlashers.length === 0 && (
            <p className="no-data">No flash stats available yet.</p>
          )}

          {!teamFlashLoading && !teamFlashError && teamFlashers.length > 0 && (
            <table className="flash-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Team Flashes</th>
                  <th>Total Blind Duration</th>
                  <th>Matches</th>
                  <th>Avg/Match</th>
                </tr>
              </thead>
              <tbody>
                {teamFlashers.map((player, index) => (
                  <tr key={player.steamId} className={index < 3 ? 'top-three' : ''}>
                    <td className="rank">
                      {index === 0 && '1st'}
                      {index === 1 && '2nd'}
                      {index === 2 && '3rd'}
                      {index > 2 && `${index + 1}th`}
                    </td>
                    <td>
                      <Link to={`/player/${player.steamId}`} className="player-link">
                        {player.name}
                      </Link>
                    </td>
                    <td className="stat shame-stat">{player.totalTeammatesFlashed}</td>
                    <td>{player.totalTeamBlindDuration.toFixed(1)}s</td>
                    <td>{player.matchCount}</td>
                    <td>{player.avgTeamFlashesPerMatch.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Hall of Fame - Enemy Flashers */}
      {activeTab === 'fame' && (
        <div className="flash-leaderboard fame">
          <h2>Enemy Flash Hall of Fame</h2>
          <p className="leaderboard-description">
            Players ranked by how effectively they flash enemies.
            Higher numbers = better utility usage!
          </p>

          {enemyFlashLoading && <Loading />}
          {enemyFlashError && <ErrorMessage message={enemyFlashError} />}

          {!enemyFlashLoading && !enemyFlashError && enemyFlashers.length === 0 && (
            <p className="no-data">No flash stats available yet.</p>
          )}

          {!enemyFlashLoading && !enemyFlashError && enemyFlashers.length > 0 && (
            <table className="flash-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Enemies Flashed</th>
                  <th>Total Blind Duration</th>
                  <th>Matches</th>
                  <th>Avg/Match</th>
                </tr>
              </thead>
              <tbody>
                {enemyFlashers.map((player, index) => (
                  <tr key={player.steamId} className={index < 3 ? 'top-three' : ''}>
                    <td className="rank">
                      {index === 0 && '1st'}
                      {index === 1 && '2nd'}
                      {index === 2 && '3rd'}
                      {index > 2 && `${index + 1}th`}
                    </td>
                    <td>
                      <Link to={`/player/${player.steamId}`} className="player-link">
                        {player.name}
                      </Link>
                    </td>
                    <td className="stat fame-stat">{player.totalTeammatesFlashed}</td>
                    <td>{player.totalTeamBlindDuration.toFixed(1)}s</td>
                    <td>{player.matchCount}</td>
                    <td>{player.avgTeamFlashesPerMatch.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CSS Styles for this page */}
      <style>{`
        .flash-stats-page {
          max-width: 900px;
          margin: 0 auto;
        }

        .page-description {
          color: #888;
          margin-bottom: 2rem;
        }

        .flash-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .flash-tab {
          padding: 0.75rem 1.5rem;
          border: none;
          background: #2a2a2a;
          color: #ccc;
          cursor: pointer;
          border-radius: 4px;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .flash-tab:hover {
          background: #3a3a3a;
        }

        .flash-tab.active {
          background: #4a4a4a;
          color: #fff;
        }

        .flash-leaderboard h2 {
          margin-bottom: 0.5rem;
        }

        .leaderboard-description {
          color: #888;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .flash-table {
          width: 100%;
          border-collapse: collapse;
        }

        .flash-table th,
        .flash-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #333;
        }

        .flash-table th {
          background: #1a1a1a;
          font-weight: 600;
          color: #aaa;
        }

        .flash-table tbody tr:hover {
          background: #2a2a2a;
        }

        .flash-table .top-three {
          background: #1f1f1f;
        }

        .flash-table .rank {
          font-weight: bold;
          color: #888;
        }

        .flash-table .top-three .rank {
          color: #ffd700;
        }

        .flash-table .stat {
          font-weight: bold;
          font-size: 1.1rem;
        }

        .flash-table .shame-stat {
          color: #ff6b6b;
        }

        .flash-table .fame-stat {
          color: #51cf66;
        }

        .player-link {
          color: #74c0fc;
          text-decoration: none;
        }

        .player-link:hover {
          text-decoration: underline;
        }

        .no-data {
          color: #666;
          text-align: center;
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}
