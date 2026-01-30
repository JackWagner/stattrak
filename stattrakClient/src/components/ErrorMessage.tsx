// =============================================================================
// ERROR MESSAGE COMPONENT - Displayed when something goes wrong
// =============================================================================
// This component shows error messages to the user in a consistent format.
// It can optionally include a retry button to attempt the failed action again.
// =============================================================================

// -----------------------------------------------------------------------------
// Props Interface
// -----------------------------------------------------------------------------
interface ErrorMessageProps {
  message: string;           // The error message to display
  onRetry?: () => void;      // Optional function to call when retry is clicked
                             // The "() => void" type means "a function that takes
                             // no arguments and returns nothing"
}

// -----------------------------------------------------------------------------
// The ErrorMessage Component
// -----------------------------------------------------------------------------
function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="error-message">
      {/* Error icon (just text for simplicity, could be an SVG icon) */}
      <span className="error-icon">!</span>

      {/* The error message */}
      <p>{message}</p>

      {/* Conditionally render the retry button */}
      {/* In JSX, {condition && <element>} renders the element only if condition is true */}
      {/* This is called "short-circuit evaluation" - if onRetry exists, show the button */}
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
