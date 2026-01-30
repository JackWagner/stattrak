// =============================================================================
// APP COMPONENT - The root component that sets up routing
// =============================================================================
// This is the main component of our React application.
// It defines all the routes (URLs) and which page component to show for each.
//
// React Router works like this:
// - <Routes> wraps all your route definitions
// - <Route path="/something" element={<Component />} /> says:
//   "When the URL is /something, render this Component"
// - ":matchId" is a URL parameter - it matches any value and passes it to the component
// =============================================================================

import { Routes, Route } from 'react-router-dom';
import {
  HomePage,
  MatchesPage,
  MatchDetailPage,
  PlayerPage,
  FlashStatsPage,
} from './pages';

// We still need to import the global styles
import './index.css';

// -----------------------------------------------------------------------------
// The App Component
// -----------------------------------------------------------------------------
function App() {
  return (
    // <Routes> is the container for all route definitions
    <Routes>
      {/*
        HOME PAGE
        Path: / (the root URL, e.g., http://localhost:5173/)
        This is what shows when you first visit the site
      */}
      <Route path="/" element={<HomePage />} />

      {/*
        MATCHES LIST PAGE
        Path: /matches
        Shows a paginated list of all matches
      */}
      <Route path="/matches" element={<MatchesPage />} />

      {/*
        MATCH DETAIL PAGE
        Path: /matches/:matchId
        The :matchId is a parameter - it can be any value
        Example: /matches/abc123 would show details for match "abc123"
        The component can access this value using useParams()
      */}
      <Route path="/matches/:matchId" element={<MatchDetailPage />} />

      {/*
        PLAYER PROFILE PAGE
        Path: /players/:steamId
        Shows stats for a specific player
        Example: /players/76561198012345678
      */}
      <Route path="/players/:steamId" element={<PlayerPage />} />

      {/*
        FLASH STATS PAGE
        Path: /flashes
        Shows flashbang statistics - team flash hall of shame and enemy flash hall of fame
      */}
      <Route path="/flashes" element={<FlashStatsPage />} />

      {/*
        CATCH-ALL / 404 PAGE
        Path: * (asterisk matches anything)
        If none of the above routes match, show this
        This handles invalid URLs gracefully
      */}
      <Route
        path="*"
        element={
          <div className="not-found">
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/">Go Home</a>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
