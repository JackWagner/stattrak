// =============================================================================
// STAT CARD COMPONENT - Displays a single statistic in a nice box
// =============================================================================
// This is a reusable component for displaying stats like "Total Kills: 500"
// in a visually appealing card format. Used throughout the app.
// =============================================================================

// -----------------------------------------------------------------------------
// Props Interface
// -----------------------------------------------------------------------------
interface StatCardProps {
  label: string;                    // The stat name (e.g., "Total Kills")
  value: string | number;           // The stat value (e.g., 500 or "75%")
  subtext?: string;                 // Optional additional info below the value
}

// -----------------------------------------------------------------------------
// The StatCard Component
// -----------------------------------------------------------------------------
function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="stat-card">
      {/* The stat label at the top */}
      <span className="stat-label">{label}</span>

      {/* The main value, displayed prominently */}
      <span className="stat-value">{value}</span>

      {/* Optional subtext below the value */}
      {subtext && <span className="stat-subtext">{subtext}</span>}
    </div>
  );
}

export default StatCard;
