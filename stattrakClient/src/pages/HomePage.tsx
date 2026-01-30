// =============================================================================
// HOME PAGE - The landing page of the application
// =============================================================================
// This page displays:
// - A welcome message
// - Player search box
// - Recent matches preview
// - Quick stats overview
// =============================================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout, Loading, ErrorMessage, PlayerSearch } from '../components';
import { getMatches } from '../services/api';
import type { MatchSummary } from '../types';

// -----------------------------------------------------------------------------
// The HomePage Component
// -----------------------------------------------------------------------------
function HomePage() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  // We track three pieces of state:
  // 1. matches - the list of recent matches to display
  // 2. loading - whether we're currently fetching data
  // 3. error - any error message to display
  // ---------------------------------------------------------------------------
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // EFFECT - Runs when the component first appears on screen
  // ---------------------------------------------------------------------------
  // useEffect is a React hook for side effects (like fetching data).
  // The function inside runs after the component renders.
  // The empty array [] means "only run once when component mounts"
  // (mount = first appears on screen)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Define an async function to fetch data
    // (useEffect can't be async directly, so we define a function inside)
    async function fetchRecentMatches() {
      try {
        // Set loading to true before we start fetching
        setLoading(true);
        // Clear any previous errors
        setError(null);

        // Fetch the 5 most recent matches
        const result = await getMatches(1, 5);

        // Update state with the fetched matches
        setMatches(result.data);
      } catch (err) {
        // If something went wrong, save the error message
        // "err instanceof Error" checks if it's a proper Error object
        setError(err instanceof Error ? err.message : 'Failed to load matches');
      } finally {
        // Whether success or error, we're done loading
        // "finally" always runs after try or catch
        setLoading(false);
      }
    }

    // Call the async function
    fetchRecentMatches();
  }, []); // Empty dependency array = run once on mount

  // ---------------------------------------------------------------------------
  // HELPER FUNCTION - Format date for display
  // ---------------------------------------------------------------------------
  // Takes an ISO date string and returns a human-readable format
  // ---------------------------------------------------------------------------
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER - What the component displays
  // ---------------------------------------------------------------------------
  return (
    <Layout>
      {/* Hero Section - Welcome message */}
      <section className="hero">
        <h1>Welcome to Stattrak</h1>
        <p>Track and analyze your CS2 match statistics</p>

        {/* Player search box */}
        <PlayerSearch />
      </section>

      {/* Recent Matches Section */}
      <section className="section">
        <div className="section-header">
          <h2>Recent Matches</h2>
          <Link to="/matches" className="view-all-link">
            View All
          </Link>
        </div>

        {/* Conditional rendering based on state */}
        {/* Show loading spinner while fetching */}
        {loading && <Loading message="Loading recent matches..." />}

        {/* Show error if something went wrong */}
        {error && <ErrorMessage message={error} />}

        {/* Show matches if we have them and not loading */}
        {!loading && !error && matches.length > 0 && (
          <div className="matches-grid">
            {/* .map() transforms each match into a JSX element */}
            {/* Think of it like a loop that outputs elements */}
            {matches.map((match) => (
              // Each item in a list needs a unique "key" prop
              // React uses this to efficiently update the list
              <Link
                key={match.matchId}
                to={`/matches/${match.matchId}`}
                className="match-card"
              >
                <div className="match-map">{match.map}</div>
                <div className="match-score">
                  <span className="ct-score">{match.ctScore}</span>
                  <span className="score-divider">-</span>
                  <span className="t-score">{match.tScore}</span>
                </div>
                <div className="match-date">{formatDate(match.playedAt)}</div>
              </Link>
            ))}
          </div>
        )}

        {/* Show message if no matches found */}
        {!loading && !error && matches.length === 0 && (
          <p className="no-data">No matches found. Start playing to see your stats!</p>
        )}
      </section>
    </Layout>
  );
}

export default HomePage;
