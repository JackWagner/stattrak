// =============================================================================
// MATCHES PAGE - Displays a paginated list of all matches
// =============================================================================
// This page shows all matches in the database with pagination controls.
// Users can click on a match to see its full details.
// =============================================================================

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout, Loading, ErrorMessage } from '../components';
import { getMatches } from '../services/api';
import type { MatchSummary } from '../types';

// -----------------------------------------------------------------------------
// The MatchesPage Component
// -----------------------------------------------------------------------------
function MatchesPage() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  // ---------------------------------------------------------------------------
  // URL SEARCH PARAMS
  // ---------------------------------------------------------------------------
  // useSearchParams lets us read and write URL query parameters
  // e.g., /matches?page=2 - we can read "page" from the URL
  // This makes the page number shareable via URL
  // ---------------------------------------------------------------------------
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current page from URL, default to 1 if not present
  // parseInt converts string to number, 10 is the radix (base 10)
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // ---------------------------------------------------------------------------
  // EFFECT - Fetch matches when page changes
  // ---------------------------------------------------------------------------
  // The [currentPage] dependency array means this runs whenever currentPage changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true);
        setError(null);

        // Fetch matches for the current page
        const result = await getMatches(currentPage, 20);

        setMatches(result.data);
        // Update total pages for pagination controls
        setTotalPages(result.meta?.totalPages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load matches');
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [currentPage]); // Re-run when page changes

  // ---------------------------------------------------------------------------
  // PAGINATION HANDLERS
  // ---------------------------------------------------------------------------
  // These functions update the URL search params, which triggers a re-fetch
  // ---------------------------------------------------------------------------
  const goToPage = (page: number) => {
    // Update the URL query parameter
    setSearchParams({ page: page.toString() });
    // Scroll to top of page for better UX
    window.scrollTo(0, 0);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // ---------------------------------------------------------------------------
  // HELPER FUNCTION - Format date
  // ---------------------------------------------------------------------------
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <Layout>
      <div className="page-header">
        <h1>All Matches</h1>
      </div>

      {/* Loading state */}
      {loading && <Loading message="Loading matches..." />}

      {/* Error state */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => goToPage(currentPage)} // Retry by "going to" current page
        />
      )}

      {/* Matches list */}
      {!loading && !error && (
        <>
          {/* Match list */}
          {matches.length > 0 ? (
            <div className="matches-list">
              {matches.map((match) => (
                <Link
                  key={match.matchId}
                  to={`/matches/${match.matchId}`}
                  className="match-list-item"
                >
                  {/* Map name */}
                  <div className="match-info">
                    <span className="match-map">{match.map}</span>
                    <span className="match-date">{formatDate(match.playedAt)}</span>
                  </div>

                  {/* Score */}
                  <div className="match-score">
                    <span className="ct-score">{match.ctScore}</span>
                    <span className="score-divider">:</span>
                    <span className="t-score">{match.tScore}</span>
                  </div>

                  {/* Player count */}
                  <div className="match-players">
                    {match.playerCount} players
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="no-data">No matches found.</p>
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="pagination">
              {/* Previous button - disabled on first page */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage <= 1}
                className="pagination-button"
              >
                Previous
              </button>

              {/* Current page indicator */}
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>

              {/* Next button - disabled on last page */}
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className="pagination-button"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

export default MatchesPage;
