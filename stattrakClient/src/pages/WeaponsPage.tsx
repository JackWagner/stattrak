// =============================================================================
// WEAPONS PAGE - Displays global weapon statistics
// =============================================================================
// This page shows statistics for all weapons across all matches:
// - Total kills with each weapon
// - Headshot percentages
// - Usage statistics
// =============================================================================

import { useEffect, useState } from 'react';
import { Layout, Loading, ErrorMessage } from '../components';
import { getWeapons } from '../services/api';
import type { GlobalWeaponStats } from '../types';

// -----------------------------------------------------------------------------
// The WeaponsPage Component
// -----------------------------------------------------------------------------
function WeaponsPage() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [weapons, setWeapons] = useState<GlobalWeaponStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sort configuration - which column and direction
  const [sortBy, setSortBy] = useState<keyof GlobalWeaponStats>('totalKills');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // ---------------------------------------------------------------------------
  // EFFECT - Fetch weapons data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function fetchWeapons() {
      try {
        setLoading(true);
        setError(null);

        const data = await getWeapons();
        setWeapons(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load weapons');
      } finally {
        setLoading(false);
      }
    }

    fetchWeapons();
  }, []);

  // ---------------------------------------------------------------------------
  // SORTING
  // ---------------------------------------------------------------------------

  // Handle clicking on a column header to sort
  const handleSort = (column: keyof GlobalWeaponStats) => {
    if (sortBy === column) {
      // If already sorting by this column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending (highest first)
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Sort the weapons array
  // [...weapons] creates a copy so we don't mutate the original
  const sortedWeapons = [...weapons].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    // Handle string vs number comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // Numeric comparison
    const aNum = aValue as number;
    const bNum = bValue as number;
    return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
  });

  // Helper to render sort indicator
  const getSortIndicator = (column: keyof GlobalWeaponStats) => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <Layout>
      <div className="page-header">
        <h1>Weapon Statistics</h1>
        <p>Global statistics across all matches</p>
      </div>

      {/* Loading state */}
      {loading && <Loading message="Loading weapon stats..." />}

      {/* Error state */}
      {error && <ErrorMessage message={error} />}

      {/* Weapons table */}
      {!loading && !error && (
        <section className="section">
          {weapons.length > 0 ? (
            <table className="data-table sortable">
              <thead>
                <tr>
                  {/* Each header is clickable to sort by that column */}
                  <th onClick={() => handleSort('weapon')}>
                    Weapon{getSortIndicator('weapon')}
                  </th>
                  <th onClick={() => handleSort('totalKills')}>
                    Total Kills{getSortIndicator('totalKills')}
                  </th>
                  <th onClick={() => handleSort('totalHeadshots')}>
                    Headshots{getSortIndicator('totalHeadshots')}
                  </th>
                  <th onClick={() => handleSort('headshotPercentage')}>
                    HS%{getSortIndicator('headshotPercentage')}
                  </th>
                  <th onClick={() => handleSort('avgKillsPerMatch')}>
                    Avg K/Match{getSortIndicator('avgKillsPerMatch')}
                  </th>
                  <th onClick={() => handleSort('uniqueUsers')}>
                    Players{getSortIndicator('uniqueUsers')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedWeapons.map((weapon) => (
                  <tr key={weapon.weapon}>
                    <td className="weapon-name">{weapon.weapon}</td>
                    <td>{weapon.totalKills.toLocaleString()}</td>
                    <td>{weapon.totalHeadshots.toLocaleString()}</td>
                    <td>{weapon.headshotPercentage.toFixed(1)}%</td>
                    <td>{weapon.avgKillsPerMatch.toFixed(2)}</td>
                    <td>{weapon.uniqueUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">No weapon data available</p>
          )}
        </section>
      )}
    </Layout>
  );
}

export default WeaponsPage;
