"""
Run File Stats Inserter
=======================
Populates local JSON tables with demo data.
"""

import os
import logging
from demoparser2 import DemoParser
from file_stats_inserter import FileStatsInserter

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Path to demo file
DEMO_PATH = os.path.join(os.path.dirname(__file__), '..', 'demos', 'example_premier.dem')

def main():
    print(f"Parsing demo: {DEMO_PATH}")

    if not os.path.exists(DEMO_PATH):
        print(f"ERROR: Demo file not found at {DEMO_PATH}")
        return

    # Parse demo
    parser = DemoParser(DEMO_PATH)

    # Create inserter and run
    inserter = FileStatsInserter(
        parser=parser,
        demo_filename=os.path.basename(DEMO_PATH),
        demo_path=os.path.abspath(DEMO_PATH)
    )

    match_id, voice_result = inserter.insert_all(extract_voice=True)
    print(f"\nSuccessfully inserted data for match: {match_id}")

    if voice_result:
        if voice_result.has_voice_data:
            print(f"Voice files extracted: {len(voice_result.files)}")
        else:
            print("No voice data in demo (Valve MM demos don't include voice)")
    print(f"Tables written to: {inserter.storage.tables_dir}")

if __name__ == "__main__":
    main()
