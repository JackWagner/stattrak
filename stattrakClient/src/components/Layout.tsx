// =============================================================================
// LAYOUT COMPONENT - The main wrapper for all pages
// =============================================================================
// This component provides the consistent structure around every page:
// - Navigation header at the top
// - Main content area in the middle
// - Footer at the bottom
//
// The "children" prop is a special React prop that contains whatever is
// placed between the opening and closing tags of this component.
// Example: <Layout><SomeContent /></Layout> - SomeContent becomes "children"
// =============================================================================

import { Link } from 'react-router-dom';

// -----------------------------------------------------------------------------
// TypeScript Props Interface
// -----------------------------------------------------------------------------
// This defines what props (inputs) this component accepts.
// "children" is React's way of passing nested content to a component.
// "React.ReactNode" means it can be any valid React content (elements, text, etc.)
// -----------------------------------------------------------------------------
interface LayoutProps {
  children: React.ReactNode;
}

// -----------------------------------------------------------------------------
// The Layout Component
// -----------------------------------------------------------------------------
// React components are just functions that return JSX (HTML-like syntax).
// We "destructure" the props object to extract "children" directly.
// -----------------------------------------------------------------------------
function Layout({ children }: LayoutProps) {
  return (
    // The outer div wraps everything
    <div className="layout">
      {/* ------------------------------------------------------------------- */}
      {/* HEADER - Navigation bar at the top */}
      {/* ------------------------------------------------------------------- */}
      <header className="header">
        <div className="header-content">
          {/* Logo/Title - links to home page */}
          {/* Link is from react-router-dom, it navigates without full page reload */}
          <Link to="/" className="logo">
            Stattrak
          </Link>

          {/* Navigation links */}
          <nav className="nav">
            {/* Each Link component creates a clickable navigation link */}
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/matches" className="nav-link">
              Matches
            </Link>
            <Link to="/flashes" className="nav-link">
              Flashes
            </Link>
            <Link to="/sentiment" className="nav-link">
              Sentiment
            </Link>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* MAIN CONTENT - Where page-specific content goes */}
      {/* ------------------------------------------------------------------- */}
      {/* The "children" prop is rendered here - this is whatever content */}
      {/* is passed between <Layout> and </Layout> tags */}
      <main className="main">
        {children}
      </main>

      {/* ------------------------------------------------------------------- */}
      {/* FOOTER - Bottom of the page */}
      {/* ------------------------------------------------------------------- */}
      <footer className="footer">
        <p>Stattrak - CS2 Match Statistics</p>
      </footer>
    </div>
  );
}

// Export the component so other files can import and use it
export default Layout;
