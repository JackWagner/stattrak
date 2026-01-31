"""
Process Local Demos
====================
Processes all .dem files from the demos/ folder and stores them in local JSON tables.

Usage:
    python demoETL/process_local_demos.py
"""

import os
import sys
import logging
from pathlib import Path
from demoparser2 import DemoParser
from file_stats_inserter import FileStatsInserter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def process_demo(demo_path: str) -> bool:
    """
    Process a single demo file and store in local tables.

    Args:
        demo_path: Full path to the .dem file

    Returns:
        True if successful, False otherwise
    """
    demo_filename = os.path.basename(demo_path)
    logger.info(f"Processing demo: {demo_filename}")

    try:
        # Parse the demo
        parser = DemoParser(demo_path)

        # Create inserter and process
        inserter = FileStatsInserter(
            parser=parser,
            demo_filename=demo_filename,
            demo_path=demo_path
        )

        # Insert all data
        logger.info(f"  - Inserting match metadata...")
        inserter.insert_match()

        logger.info(f"  - Inserting player data...")
        inserter.insert_player_matches()

        logger.info(f"  - Inserting rounds...")
        inserter.insert_rounds()

        logger.info(f"  - Inserting kills...")
        inserter.insert_kills()

        logger.info(f"  - Inserting flash stats...")
        inserter.insert_flash_stats()

        logger.info(f"  - Inserting damage stats...")
        inserter.insert_damage_stats()

        logger.info(f"  - Inserting weapon stats...")
        inserter.insert_weapon_stats()

        logger.info(f"  - Inserting chat messages...")
        inserter.insert_chat_messages()

        logger.info(f"✓ Successfully processed: {demo_filename}")
        return True

    except Exception as e:
        logger.error(f"✗ Failed to process {demo_filename}: {e}")
        return False


def main():
    """Main processing function."""
    # Get project root and demos directory
    project_root = Path(__file__).parent.parent
    demos_dir = project_root / "demos"

    if not demos_dir.exists():
        logger.error(f"Demos directory not found: {demos_dir}")
        sys.exit(1)

    # Find all .dem files
    demo_files = list(demos_dir.glob("*.dem"))

    if not demo_files:
        logger.warning(f"No .dem files found in {demos_dir}")
        sys.exit(0)

    logger.info(f"Found {len(demo_files)} demo file(s) to process")
    logger.info("=" * 60)

    # Process each demo
    successful = 0
    failed = 0

    for demo_path in demo_files:
        if process_demo(str(demo_path)):
            successful += 1
        else:
            failed += 1
        logger.info("-" * 60)

    # Summary
    logger.info("=" * 60)
    logger.info(f"Processing complete!")
    logger.info(f"  Successful: {successful}")
    logger.info(f"  Failed: {failed}")
    logger.info(f"  Total: {len(demo_files)}")

    # Show where data was stored
    tables_dir = project_root / "tables"
    logger.info(f"\nData stored in: {tables_dir}")

    if tables_dir.exists():
        json_files = list(tables_dir.glob("*.json"))
        logger.info(f"Generated {len(json_files)} table file(s):")
        for json_file in sorted(json_files):
            size_kb = json_file.stat().st_size / 1024
            logger.info(f"  - {json_file.name} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
