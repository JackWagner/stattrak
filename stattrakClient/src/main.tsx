// =============================================================================
// MAIN ENTRY POINT - Where the React app starts
// =============================================================================
// This file is the entry point of the application. It:
// 1. Imports React and ReactDOM
// 2. Wraps our App in necessary providers (like BrowserRouter)
// 3. Renders the app to the DOM
//
// Think of this as the "bootstrap" file that kicks everything off.
// =============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// -----------------------------------------------------------------------------
// Render the App
// -----------------------------------------------------------------------------
// document.getElementById('root') finds the <div id="root"> in index.html
// createRoot() creates a React root for rendering
// .render() actually displays our React components
// -----------------------------------------------------------------------------
createRoot(document.getElementById('root')!).render(
  // StrictMode enables extra checks and warnings during development
  // It doesn't affect production builds
  <StrictMode>
    {/*
      BrowserRouter enables client-side routing
      It needs to wrap any components that use routing features
      (like <Link>, <Routes>, useNavigate, useParams, etc.)

      Without this wrapper, react-router-dom components won't work!
    */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
