"""
Unified Match Detection System
===============================
Combines match detection from multiple sources:
- Steam/Valve Matchmaking
- Faceit
- ESEA

This module polls all configured sources and provides a unified interface
for detecting new matches across platforms.

Usage:
    from unified_match_detection import UnifiedMatchDetector

    detector = UnifiedMatchDetector()
    new_matches = detector.poll_all_sources()

    for match in new_matches:
        print(f"New match from {match['source']}: {match['match_id']}")
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Import platform-specific integrations
try:
    from faceit_integration import FaceitIntegration
    FACEIT_AVAILABLE = True
except ImportError:
    logger.warning("Faceit integration not available")
    FACEIT_AVAILABLE = False

try:
    from esea_integration import ESEAIntegration
    ESEA_AVAILABLE = True
except ImportError:
    logger.warning("ESEA integration not available")
    ESEA_AVAILABLE = False

# Steam integration (existing)
try:
    from match_completion_detection import detect_new_matches as detect_steam_matches
    STEAM_AVAILABLE = True
except ImportError:
    logger.warning("Steam integration not available")
    STEAM_AVAILABLE = False


class UnifiedMatchDetector:
    """
    Unified match detection across multiple platforms.
    """

    def __init__(self):
        """Initialize unified match detector."""
        self.sources = {}

        # Initialize Faceit
        if FACEIT_AVAILABLE:
            try:
                self.sources['faceit'] = FaceitIntegration()
                logger.info("Faceit integration initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Faceit: {e}")

        # Initialize ESEA
        if ESEA_AVAILABLE:
            try:
                self.sources['esea'] = ESEAIntegration()
                logger.info("ESEA integration initialized")
            except Exception as e:
                logger.error(f"Failed to initialize ESEA: {e}")

        # Steam is handled separately through existing code
        self.steam_enabled = STEAM_AVAILABLE

        logger.info(f"Initialized with sources: {list(self.sources.keys())}")

    def poll_faceit(self, player_ids: List[str]) -> List[Dict]:
        """
        Poll Faceit for new matches.

        Args:
            player_ids: List of Faceit player IDs

        Returns:
            List of new matches
        """
        if 'faceit' not in self.sources:
            return []

        try:
            matches = self.sources['faceit'].poll_new_matches(player_ids)
            logger.info(f"Found {len(matches)} new Faceit matches")
            return matches
        except Exception as e:
            logger.error(f"Error polling Faceit: {e}")
            return []

    def poll_esea(self, steam_ids: List[str]) -> List[Dict]:
        """
        Poll ESEA for new matches.

        Args:
            steam_ids: List of Steam IDs

        Returns:
            List of new matches
        """
        if 'esea' not in self.sources:
            return []

        try:
            matches = self.sources['esea'].poll_new_matches(steam_ids)
            logger.info(f"Found {len(matches)} new ESEA matches")
            return matches
        except Exception as e:
            logger.error(f"Error polling ESEA: {e}")
            return []

    def poll_steam(self) -> List[Dict]:
        """
        Poll Steam/Valve Matchmaking for new matches.

        Returns:
            List of new matches
        """
        if not self.steam_enabled:
            return []

        try:
            # Use existing Steam match detection
            matches = detect_steam_matches()
            logger.info(f"Found {len(matches)} new Steam matches")

            # Format to match unified structure
            formatted_matches = []
            for match in matches:
                formatted_matches.append({
                    'source': 'steam',
                    'match_id': match.get('match_id'),
                    'demo_url': match.get('demo_url'),
                    'detected_at': datetime.now().isoformat()
                })

            return formatted_matches
        except Exception as e:
            logger.error(f"Error polling Steam: {e}")
            return []

    def poll_all_sources(
        self,
        faceit_players: List[str] = None,
        esea_players: List[str] = None
    ) -> List[Dict]:
        """
        Poll all configured match sources.

        Args:
            faceit_players: List of Faceit player IDs (optional)
            esea_players: List of Steam IDs for ESEA (optional)

        Returns:
            Combined list of new matches from all sources
        """
        all_matches = []

        # Poll Steam
        steam_matches = self.poll_steam()
        all_matches.extend(steam_matches)

        # Poll Faceit
        if faceit_players:
            faceit_matches = self.poll_faceit(faceit_players)
            all_matches.extend(faceit_matches)

        # Poll ESEA
        if esea_players:
            esea_matches = self.poll_esea(esea_players)
            all_matches.extend(esea_matches)

        logger.info(f"Total new matches across all sources: {len(all_matches)}")
        return all_matches

    def download_match(self, match: Dict, output_dir: str = "demos") -> Optional[str]:
        """
        Download a demo for a match based on its source.

        Args:
            match: Match dictionary with 'source' and 'match_id'
            output_dir: Directory to save demo

        Returns:
            Path to downloaded demo or None
        """
        source = match.get('source')
        match_id = match.get('match_id')

        if not source or not match_id:
            logger.error(f"Invalid match data: {match}")
            return None

        output_path = f"{output_dir}/{source}_{match_id}.dem"

        try:
            if source == 'steam':
                # Use existing Steam demo download
                demo_url = match.get('demo_url')
                if demo_url:
                    # Import and use existing download function
                    from demo import download_demo
                    download_demo(demo_url, output_path)
                    return output_path

            elif source == 'faceit':
                if 'faceit' in self.sources:
                    demo_url = self.sources['faceit'].get_demo_url(match_id)
                    if demo_url:
                        self.sources['faceit'].download_demo(demo_url, output_path)
                        return output_path

            elif source == 'esea':
                if 'esea' in self.sources:
                    demo_url = self.sources['esea'].get_demo_url(match_id)
                    if demo_url:
                        self.sources['esea'].download_demo(demo_url, output_path)
                        return output_path

            logger.warning(f"Could not download match from {source}")
            return None

        except Exception as e:
            logger.error(f"Error downloading match {match_id} from {source}: {e}")
            return None

    def get_match_summary(self) -> Dict:
        """
        Get summary of available sources and their status.

        Returns:
            Dictionary with source status information
        """
        return {
            'steam': {
                'enabled': self.steam_enabled,
                'description': 'Valve CS2 Matchmaking'
            },
            'faceit': {
                'enabled': 'faceit' in self.sources,
                'description': 'Faceit Platform',
                'api_required': True
            },
            'esea': {
                'enabled': 'esea' in self.sources,
                'description': 'ESEA League',
                'api_required': False,
                'note': 'Uses web scraping'
            }
        }


if __name__ == "__main__":
    import argparse
    import json
    import sys

    # Setup argument parser
    parser = argparse.ArgumentParser(description='Unified match detection across platforms')
    parser.add_argument('--summary', action='store_true', help='Get source summary')
    parser.add_argument('--poll', action='store_true', help='Poll all sources for new matches')
    parser.add_argument('--download', action='store_true', help='Download a match demo')
    parser.add_argument('--faceit-players', type=str, help='Comma-separated Faceit player IDs')
    parser.add_argument('--esea-players', type=str, help='Comma-separated Steam IDs for ESEA')
    parser.add_argument('--source', type=str, help='Match source (steam, faceit, esea)')
    parser.add_argument('--match-id', type=str, help='Match ID to download')
    parser.add_argument('--output-dir', type=str, default='demos', help='Output directory for demos')

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        stream=sys.stderr  # Log to stderr so stdout is clean JSON
    )

    detector = UnifiedMatchDetector()

    try:
        if args.summary:
            # Return source summary as JSON
            summary = detector.get_match_summary()
            print(json.dumps(summary))

        elif args.poll:
            # Parse player IDs
            faceit_players = args.faceit_players.split(',') if args.faceit_players else []
            esea_players = args.esea_players.split(',') if args.esea_players else []

            # Poll all sources
            new_matches = detector.poll_all_sources(
                faceit_players=faceit_players,
                esea_players=esea_players
            )

            # Return matches as JSON
            print(json.dumps(new_matches))

        elif args.download:
            # Download a match demo
            if not args.source or not args.match_id:
                raise ValueError("--source and --match-id required for download")

            match = {
                'source': args.source,
                'match_id': args.match_id
            }

            demo_path = detector.download_match(match, args.output_dir)

            result = {
                'demo_path': demo_path,
                'success': demo_path is not None
            }
            print(json.dumps(result))

        else:
            # Example usage - interactive mode
            print("\nMatch Detection Sources:")
            print("=" * 50)
            summary = detector.get_match_summary()
            for source, info in summary.items():
                status = "✓" if info['enabled'] else "✗"
                print(f"{status} {source.upper()}: {info['description']}")

            print("\nPolling for new matches...")

            # Poll all sources
            new_matches = detector.poll_all_sources(
                faceit_players=[],  # Add Faceit player IDs
                esea_players=[]      # Add Steam IDs for ESEA
            )

            print(f"\nFound {len(new_matches)} new matches")

            for match in new_matches:
                print(f"  - {match['source']}: {match.get('match_id')}")

    except Exception as e:
        logger.error(f"Error: {e}")
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
