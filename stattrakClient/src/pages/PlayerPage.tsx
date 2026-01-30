// =============================================================================
// PLAYER PAGE - Shows a player's profile and statistics
// =============================================================================
// This page displays:
// - Player's overall stats (K/D, win rate, etc.)
// - Match history
// - Map performance
// =============================================================================

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout, Loading, ErrorMessage, StatCard } from '../components';
import {
  getPlayer,
  getPlayerMatches,
  getPlayerMaps,
} from '../services/api';
import type {
  PlayerStats,
  PlayerMatchStats,
  PlayerMapStats,
} from '../types';

// -----------------------------------------------------------------------------
// The PlayerPage Component
// -----------------------------------------------------------------------------
function PlayerPage() {
  // ---------------------------------------------------------------------------
  // URL PARAMS - Get the Steam ID from the URL
  // ---------------------------------------------------------------------------
  const { steamId } = useParams<{ steamId: string }>();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [player, setPlayer] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<PlayerMatchStats[]>([]);
  const [maps, setMaps] = useState<PlayerMapStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which tab is active (matches or maps)
  const [activeTab, setActiveTab] = useState<'matches' | 'maps'>('matches');

  // ---------------------------------------------------------------------------
  // EFFECT - Fetch player data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function fetchPlayerData() {
      if (!steamId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all player data in parallel for speed
        const [playerData, matchesData, mapsData] = await Promise.all([
          getPlayer(steamId),
          getPlayerMatches(steamId, 1, 10),  // First 10 matches
          getPlayerMaps(steamId),
        ]);

        setPlayer(playerData);
        setMatches(matchesData.data);
        setMaps(mapsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load player');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayerData();
  }, [steamId]);

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get CSS class based on match result
  const getResultClass = (result: string) => {
    switch (result) {
      case 'WIN':
        return 'result-win';
      case 'LOSS':
        return 'result-loss';
      default:
        return 'result-tie';
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Layout>
        <Loading message="Loading player profile..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorMessage message={error} />
      </Layout>
    );
  }

  if (!player) {
    return (
      <Layout>
        <ErrorMessage message="Player not found" />
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Player Header */}
      <div className="player-header">
        <h1>{player.name}</h1>
        <p className="steam-id">Steam ID: {player.steamId}</p>
      </div>

      {/* Stats Overview */}
      <section className="section">
        <h2>Overall Stats</h2>
        <div className="stats-grid">
          <StatCard
            label="Matches"
            value={player.totalMatches}
            subtext={`${player.wins}W - ${player.losses}L - ${player.ties}T`}
          />
          <StatCard
            label="Win Rate"
            value={`${player.winRate.toFixed(1)}%`}
          />
          <StatCard
            label="K/D Ratio"
            value={player.kd.toFixed(2)}
            subtext={`${player.totalKills}K / ${player.totalDeaths}D`}
          />
          <StatCard
            label="ADR"
            value={player.adr.toFixed(1)}
            subtext="Avg Damage/Round"
          />
          <StatCard
            label="Headshot %"
            value={`${player.headshotPercentage.toFixed(1)}%`}
          />
          <StatCard
            label="Total MVPs"
            value={player.totalMvps}
          />
        </div>
      </section>

      {/* Tabs for different data views */}
      <section className="section">
        {/* Tab buttons */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            Recent Matches
          </button>
          <button
            className={`tab ${activeTab === 'maps' ? 'active' : ''}`}
            onClick={() => setActiveTab('maps')}
          >
            Maps
          </button>
        </div>

        {/* Tab content - conditionally rendered based on activeTab */}
        <div className="tab-content">
          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div className="matches-tab">
              {matches.length > 0 ? (
                <div className="player-matches-list">
                  {matches.map((match) => (
                    <Link
                      key={match.matchId}
                      to={`/matches/${match.matchId}`}
                      className={`player-match-item ${getResultClass(match.result)}`}
                    >
                      <div className="match-result">{match.result}</div>
                      <div className="match-map">{match.map}</div>
                      <div className="match-stats">
                        {match.kills}/{match.deaths}/{match.assists}
                      </div>
                      <div className="match-date">{formatDate(match.playedAt)}</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="no-data">No matches found</p>
              )}
            </div>
          )}

          {/* Maps Tab */}
          {activeTab === 'maps' && (
            <div className="maps-tab">
              {maps.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Map</th>
                      <th>Matches</th>
                      <th>Win Rate</th>
                      <th>Avg K</th>
                      <th>Avg D</th>
                      <th>ADR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maps.map((map) => (
                      <tr key={map.map}>
                        <td className="map-name">{map.map}</td>
                        <td>{map.matches}</td>
                        <td>{map.winRate.toFixed(1)}%</td>
                        <td>{map.avgKills.toFixed(1)}</td>
                        <td>{map.avgDeaths.toFixed(1)}</td>
                        <td>{map.avgAdr.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No map data found</p>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

export default PlayerPage;
