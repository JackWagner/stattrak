// =============================================================================
// PLAYER SEARCH COMPONENT - Search box to find players by Steam ID
// =============================================================================
// This component provides a text input and button for searching players.
// When the user submits, it navigates to that player's profile page.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// -----------------------------------------------------------------------------
// The PlayerSearch Component
// -----------------------------------------------------------------------------
function PlayerSearch() {
  // ---------------------------------------------------------------------------
  // STATE - Data that can change over time
  // ---------------------------------------------------------------------------
  // useState is a React "hook" that lets us store data that can change.
  // It returns an array with two items:
  //   1. The current value (steamId)
  //   2. A function to update it (setSteamId)
  //
  // When we call setSteamId("new value"), React re-renders the component
  // with the new value.
  // ---------------------------------------------------------------------------
  const [steamId, setSteamId] = useState('');

  // ---------------------------------------------------------------------------
  // NAVIGATION HOOK
  // ---------------------------------------------------------------------------
  // useNavigate is a hook from react-router-dom that lets us navigate
  // to different pages programmatically (instead of using <Link>).
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // FORM SUBMIT HANDLER
  // ---------------------------------------------------------------------------
  // This function runs when the form is submitted (button clicked or Enter pressed).
  // We use it to navigate to the player's page.
  //
  // "e: React.FormEvent" - TypeScript type for form submission events
  // "e.preventDefault()" - Stops the browser's default form submission behavior
  //                        (which would cause a full page reload)
  // ---------------------------------------------------------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();  // Prevent page reload

    // Only navigate if the user entered something
    // .trim() removes whitespace from both ends of the string
    if (steamId.trim()) {
      // Navigate to the player page with this Steam ID
      navigate(`/players/${steamId.trim()}`);
    }
  };

  return (
    // The <form> element groups the input and button together
    // onSubmit runs our handler when the form is submitted
    <form onSubmit={handleSubmit} className="player-search">
      <input
        type="text"
        // "value" makes this a "controlled input" - React controls its value
        value={steamId}
        // "onChange" fires every time the user types
        // "e.target.value" is what the user typed
        onChange={(e) => setSteamId(e.target.value)}
        placeholder="Enter Steam ID..."
        className="search-input"
      />
      <button type="submit" className="search-button">
        Search
      </button>
    </form>
  );
}

export default PlayerSearch;
