// =============================================================================
// CAREER PAGE - Shows a player's career progression and trends
// =============================================================================
// This page displays:
// - Career overview with lifetime stats
// - Recent form indicator (HOT/AVERAGE/COLD)
// - Performance trends over time
// - Milestones and records
// - Map-specific performance
// =============================================================================

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout, Loading, ErrorMessage, StatCard } from '../components';
import { getPlayerCareer } from '../services/api';
import type { PlayerCareer } from '../types';

// -----------------------------------------------------------------------------
// Helper Components
// -----------------------------------------------------------------------------

/** Displays a trend indicator with arrow and color */
function TrendIndicator({ value, label, invert = false }: {
  value: number;
  label: string;
  invert?: boolean; // For metrics where negative is good (e.g., team flashes)
}) {
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;
  const isNeutral = Math.abs(value) < 0.001;

  let className = 'trend-neutral';
  let arrow = '';

  if (!isNeutral) {
    if (isPositive) {
      className = 'trend-positive';
      arrow = invert ? '\u2193' : '\u2191'; // Down arrow if inverted, up otherwise
    } else if (isNegative) {
      className = 'trend-negative';
      arrow = invert ? '\u2191' : '\u2193';
    }
  }

  return (
    <div className={`trend-indicator ${className}`}>
      <span className="trend-label">{label}</span>
      <span className="trend-value">
        {arrow} {value > 0 ? '+' : ''}{value.toFixed(4)}
      </span>
    </div>
  );
}

/** Displays form rating badge */
function FormBadge({ rating }: { rating: 'HOT' | 'AVERAGE' | 'COLD' }) {
  const classMap = {
    HOT: 'form-hot',
    AVERAGE: 'form-average',
    COLD: 'form-cold',
  };

  const emojiMap = {
    HOT: '\uD83D\uDD25',
    AVERAGE: '\u2796',
    COLD: '\u2744\uFE0F',
  };

  return (
    <span className={`form-badge ${classMap[rating]}`}>
      {emojiMap[rating]} {rating}
    </span>
  );
}

/** Displays a comparison stat (recent vs career) */
function ComparisonStat({ label, recent, career, diff }: {
  label: string;
  recent: number;
  career: number;
  diff: number;
}) {
  const diffClass = diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral';

  return (
    <div className="comparison-stat">
      <div className="comparison-label">{label}</div>
      <div className="comparison-values">
        <span className="recent-value">{recent.toFixed(1)}</span>
        <span className="vs">vs</span>
        <span className="career-value">{career.toFixed(1)}</span>
        <span className={`diff-value ${diffClass}`}>
          ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
        </span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main CareerPage Component
// -----------------------------------------------------------------------------
function CareerPage() {
  const { steamId } = useParams<{ steamId: string }>();
  const [career, setCareer] = useState<PlayerCareer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'milestones' | 'maps'>('overview');

  useEffect(() => {
    async function fetchCareerData() {
      if (!steamId) return;

      try {
        setLoading(true);
        setError(null);
        const careerData = await getPlayerCareer(steamId);
        setCareer(careerData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load career data');
      } finally {
        setLoading(false);
      }
    }

    fetchCareerData();
  }, [steamId]);

  if (loading) {
    return (
      <Layout>
        <Loading message="Building career profile..." />
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

  if (!career) {
    return (
      <Layout>
        <ErrorMessage message="Career data not found" />
      </Layout>
    );
  }

  const { careerAvg, trends, milestones, recentForm, mapStats } = career;

  return (
    <Layout>
      {/* Header */}
      <div className="career-header">
        <div className="header-main">
          <h1>{career.playerName}</h1>
          <FormBadge rating={recentForm.formRating} />
        </div>
        <p className="career-subtitle">
          {career.totalMatches} matches | {career.firstMatchDate?.split('T')[0]} - {career.lastMatchDate?.split('T')[0]}
        </p>
        <Link to={`/players/${steamId}`} className="back-link">
          &larr; Back to Player Profile
        </Link>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Trends
        </button>
        <button
          className={`tab ${activeTab === 'milestones' ? 'active' : ''}`}
          onClick={() => setActiveTab('milestones')}
        >
          Milestones
        </button>
        <button
          className={`tab ${activeTab === 'maps' ? 'active' : ''}`}
          onClick={() => setActiveTab('maps')}
        >
          Maps
        </button>
      </div>

      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Recent Form Section */}
            <section className="section">
              <h2>Recent Form (Last {recentForm.matchesAnalyzed} Matches)</h2>
              <div className="form-comparison">
                <ComparisonStat
                  label="K/D"
                  recent={recentForm.recentKd}
                  career={recentForm.careerKd}
                  diff={recentForm.kdDiff}
                />
                <ComparisonStat
                  label="ADR"
                  recent={recentForm.recentAdr}
                  career={recentForm.careerAdr}
                  diff={recentForm.adrDiff}
                />
                <ComparisonStat
                  label="Win Rate %"
                  recent={recentForm.recentWinRate}
                  career={recentForm.careerWinRate}
                  diff={recentForm.winRateDiff}
                />
              </div>
            </section>

            {/* Career Averages */}
            <section className="section">
              <h2>Career Averages</h2>
              <div className="stats-grid">
                <StatCard label="K/D" value={careerAvg.kd.toFixed(2)} />
                <StatCard label="ADR" value={careerAvg.adr.toFixed(1)} />
                <StatCard label="Win Rate" value={`${careerAvg.winRate.toFixed(1)}%`} />
                <StatCard label="Headshot %" value={`${careerAvg.headshotPct.toFixed(1)}%`} />
                <StatCard label="Kills/Match" value={careerAvg.killsPerMatch.toFixed(1)} />
                <StatCard label="MVPs/Match" value={careerAvg.mvpsPerMatch.toFixed(1)} />
              </div>
            </section>

            {/* Flash Stats */}
            {careerAvg.flashEfficiency > 0 && (
              <section className="section">
                <h2>Flash Effectiveness</h2>
                <div className="stats-grid">
                  <StatCard
                    label="Enemies/Match"
                    value={careerAvg.enemiesFlashedPerMatch.toFixed(1)}
                    subtext="enemies blinded"
                  />
                  <StatCard
                    label="Teammates/Match"
                    value={careerAvg.teammatesFlashedPerMatch.toFixed(1)}
                    subtext="teammates blinded"
                  />
                  <StatCard
                    label="Efficiency"
                    value={careerAvg.flashEfficiency.toFixed(2)}
                    subtext="enemies per flash"
                  />
                </div>
              </section>
            )}

            {/* Sentiment Stats */}
            {careerAvg.messagesPerMatch > 0 && (
              <section className="section">
                <h2>Chat Behavior</h2>
                <div className="stats-grid">
                  <StatCard
                    label="Messages/Match"
                    value={careerAvg.messagesPerMatch.toFixed(1)}
                  />
                  <StatCard
                    label="Toxicity"
                    value={`${careerAvg.toxicity.toFixed(1)}%`}
                    subtext="of messages flagged"
                  />
                </div>
              </section>
            )}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="trends-tab">
            <section className="section">
              <h2>Performance Trends</h2>
              <p className="section-description">
                Positive values indicate improvement over time, negative values indicate decline.
              </p>
              <div className="trends-grid">
                <TrendIndicator value={trends.kdTrend} label="K/D Trend" />
                <TrendIndicator value={trends.adrTrend} label="ADR Trend" />
                <TrendIndicator value={trends.winRateTrend} label="Win Rate Trend" />
                <TrendIndicator value={trends.headshotTrend} label="Headshot % Trend" />
              </div>
            </section>

            {(trends.flashEfficiencyTrend !== 0 || trends.teamFlashTrend !== 0) && (
              <section className="section">
                <h2>Flash Trends</h2>
                <div className="trends-grid">
                  <TrendIndicator
                    value={trends.flashEfficiencyTrend}
                    label="Flash Efficiency"
                  />
                  <TrendIndicator
                    value={trends.teamFlashTrend}
                    label="Team Flashes"
                    invert={true}
                  />
                </div>
              </section>
            )}

            {trends.toxicityTrend !== 0 && (
              <section className="section">
                <h2>Behavior Trends</h2>
                <div className="trends-grid">
                  <TrendIndicator
                    value={trends.toxicityTrend}
                    label="Toxicity"
                    invert={true}
                  />
                </div>
              </section>
            )}

            {/* Performance History Mini-chart */}
            {career.performanceHistory.length > 0 && (
              <section className="section">
                <h2>Recent Performance</h2>
                <div className="performance-chart">
                  {career.performanceHistory.slice(-10).map((perf, idx) => (
                    <Link
                      key={perf.matchId}
                      to={`/matches/${perf.matchId}`}
                      className={`perf-bar ${perf.result.toLowerCase()}`}
                      title={`${perf.map}: ${perf.kills}/${perf.deaths}/${perf.assists} (${perf.kd} K/D)`}
                    >
                      <div
                        className="bar-fill"
                        style={{ height: `${Math.min(perf.kd * 33, 100)}%` }}
                      />
                      <span className="bar-label">{perf.kd.toFixed(1)}</span>
                    </Link>
                  ))}
                </div>
                <p className="chart-legend">Last 10 matches - Height = K/D ratio, Color = Win/Loss</p>
              </section>
            )}
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div className="milestones-tab">
            <section className="section">
              <h2>Records</h2>
              <div className="milestones-grid">
                <div className="milestone-card good">
                  <div className="milestone-label">Best K/D</div>
                  <div className="milestone-value">{milestones.bestKdValue.toFixed(2)}</div>
                  {milestones.bestKdMatch && (
                    <Link to={`/matches/${milestones.bestKdMatch}`} className="milestone-link">
                      View Match
                    </Link>
                  )}
                </div>
                <div className="milestone-card bad">
                  <div className="milestone-label">Worst K/D</div>
                  <div className="milestone-value">{milestones.worstKdValue.toFixed(2)}</div>
                  {milestones.worstKdMatch && (
                    <Link to={`/matches/${milestones.worstKdMatch}`} className="milestone-link">
                      View Match
                    </Link>
                  )}
                </div>
                <div className="milestone-card good">
                  <div className="milestone-label">Highest Kills</div>
                  <div className="milestone-value">{milestones.highestKillsValue}</div>
                  {milestones.highestKillsMatch && (
                    <Link to={`/matches/${milestones.highestKillsMatch}`} className="milestone-link">
                      View Match
                    </Link>
                  )}
                </div>
                {milestones.bestFlashMatch && (
                  <div className="milestone-card good">
                    <div className="milestone-label">Best Flash Game</div>
                    <div className="milestone-value">{milestones.bestFlashValue} enemies</div>
                    <Link to={`/matches/${milestones.bestFlashMatch}`} className="milestone-link">
                      View Match
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <section className="section">
              <h2>Streaks</h2>
              <div className="stats-grid">
                <StatCard
                  label="Longest Win Streak"
                  value={milestones.longestWinStreak.toString()}
                  subtext="matches"
                />
                <StatCard
                  label="Longest Loss Streak"
                  value={milestones.longestLossStreak.toString()}
                  subtext="matches"
                />
                <StatCard
                  label="Current Streak"
                  value={`${Math.abs(milestones.currentStreak)} ${milestones.currentStreakType}`}
                  subtext={milestones.currentStreak > 0 ? 'winning' : milestones.currentStreak < 0 ? 'losing' : ''}
                />
              </div>
            </section>

            {milestones.mostToxicMatch && (
              <section className="section">
                <h2>Behavior Records</h2>
                <div className="milestones-grid">
                  <div className="milestone-card bad">
                    <div className="milestone-label">Most Toxic Match</div>
                    <div className="milestone-value">{milestones.mostToxicValue.toFixed(1)}%</div>
                    <Link to={`/matches/${milestones.mostToxicMatch}`} className="milestone-link">
                      View Match
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Maps Tab */}
        {activeTab === 'maps' && (
          <div className="maps-tab">
            <section className="section">
              <h2>Performance by Map</h2>
              {mapStats.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Map</th>
                      <th>Matches</th>
                      <th>Win Rate</th>
                      <th>K/D</th>
                      <th>Avg ADR</th>
                      <th>Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapStats.map((map) => (
                      <tr key={map.map}>
                        <td className="map-name">{map.map}</td>
                        <td>{map.matches}</td>
                        <td className={map.winRate >= 50 ? 'stat-good' : 'stat-bad'}>
                          {map.winRate.toFixed(1)}%
                        </td>
                        <td className={map.kd >= 1 ? 'stat-good' : 'stat-bad'}>
                          {map.kd.toFixed(2)}
                        </td>
                        <td>{map.avgAdr.toFixed(1)}</td>
                        <td>{map.wins}W - {map.losses}L - {map.ties}T</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No map data available</p>
              )}
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default CareerPage;
