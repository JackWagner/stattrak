// =============================================================================
// LOADING COMPONENT - Displayed while data is being fetched
// =============================================================================
// This is a simple component that shows a loading indicator.
// It's displayed when we're waiting for API requests to complete.
// =============================================================================

// -----------------------------------------------------------------------------
// Props Interface
// -----------------------------------------------------------------------------
// "message" is optional (indicated by the "?"). If not provided, we use a default.
// -----------------------------------------------------------------------------
interface LoadingProps {
  message?: string;  // Optional custom loading message
}

// -----------------------------------------------------------------------------
// The Loading Component
// -----------------------------------------------------------------------------
// The "= 'Loading...'" is a default value - if no message is provided, use this.
// -----------------------------------------------------------------------------
function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="loading">
      {/* A simple spinning animation (styled in CSS) */}
      <div className="loading-spinner"></div>
      {/* The loading message */}
      <p>{message}</p>
    </div>
  );
}

export default Loading;
