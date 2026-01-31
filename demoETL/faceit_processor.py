"""
Faceit Match Processor Daemon
=============================
Daemon that processes queued Faceit matches.

This daemon:
1. Polls matches.faceit_queue for pending matches
2. Downloads and processes demos via Demo class
3. Moves completed matches to matches.faceit_processed

Usage:
    python faceit_processor.py

Configuration:
    Requires faceit_config.json for API access and db_user.json for database.
"""

import os
import sys
import time
import logging
import argparse
from datetime import datetime
from typing import Optional

from faceit_integration import FaceitIntegration
from demo import Demo
from db_utils import Connect

logger = logging.getLogger(__name__)


class FaceitProcessor:
    """
    Daemon for processing Faceit matches from queue.
    """

    def __init__(self, demo_dir: str = "demos/faceit"):
        """
        Initialize Faceit processor.

        Args:
            demo_dir: Directory to store downloaded demos
        """
        self.faceit = FaceitIntegration()
        self.db = Connect()
        self.demo_dir = demo_dir
        os.makedirs(demo_dir, exist_ok=True)

    def process_match(self, match: dict) -> bool:
        """
        Process a single Faceit match.

        Args:
            match: Match dictionary from queue

        Returns:
            True if processing succeeded
        """
        match_id = match['match_id']
        demo_url = match.get('demo_url')

        logger.info(f"Processing match {match_id}")
        start_time = time.time()

        try:
            # Mark as processing
            self.faceit.set_match_processing(match_id)

            # Get demo URL if not in queue entry
            if not demo_url:
                demo_url = self.faceit.get_demo_url(match_id)

            if not demo_url:
                raise ValueError(f"No demo URL available for match {match_id}")

            # Download demo
            demo_path = os.path.join(self.demo_dir, f"{match_id}.dem")
            compressed_path = f"{demo_path}.gz"

            if not self.faceit.download_demo(demo_url, compressed_path):
                raise RuntimeError(f"Failed to download demo for match {match_id}")

            # Process demo using existing Demo class
            demo = Demo(compressed_path)

            # Generate stats_match_id from demo file
            demo_filename = os.path.basename(demo_path)
            stats_match_id = demo_filename.replace('.dem', '')

            # Calculate processing time
            processing_time = int(time.time() - start_time)

            # Mark as completed
            self.faceit.mark_match_completed(
                match_id=match_id,
                demo_file=demo_filename,
                stats_match_id=stats_match_id,
                processing_time=processing_time
            )

            logger.info(f"Successfully processed match {match_id} in {processing_time}s")
            return True

        except Exception as e:
            logger.error(f"Failed to process match {match_id}: {e}")
            self.faceit.mark_match_failed(match_id, str(e))
            return False

    def process_pending_matches(self, limit: int = 10) -> int:
        """
        Process pending matches from queue.

        Args:
            limit: Maximum matches to process in this batch

        Returns:
            Number of successfully processed matches
        """
        matches = self.faceit.get_pending_matches(limit=limit)
        logger.info(f"Found {len(matches)} pending matches")

        success_count = 0
        for match in matches:
            if self.process_match(match):
                success_count += 1

        return success_count

    def process_retryable_matches(self, max_retries: int = 3) -> int:
        """
        Retry failed matches that haven't exceeded retry limit.

        Args:
            max_retries: Maximum retry attempts

        Returns:
            Number of successfully processed matches
        """
        matches = self.faceit.get_retryable_matches(max_retries=max_retries)
        logger.info(f"Found {len(matches)} retryable matches")

        success_count = 0
        for match in matches:
            logger.info(f"Retrying match {match['match_id']} (attempt {match['retry_count'] + 1})")
            if self.process_match(match):
                success_count += 1

        return success_count

    def poll_for_new_matches(self) -> int:
        """
        Poll Faceit API for new matches and add to queue.

        Returns:
            Number of new matches queued
        """
        new_matches = self.faceit.poll_new_matches()
        return len(new_matches)


def run_processor_daemon(
    poll_interval: int = 60,
    process_interval: int = 30,
    demo_dir: str = "demos/faceit"
):
    """
    Run Faceit processor as a daemon.

    Args:
        poll_interval: Seconds between polling for new matches
        process_interval: Seconds between processing queue
        demo_dir: Directory for downloaded demos
    """
    logger.info("Starting Faceit processor daemon")
    logger.info(f"Poll interval: {poll_interval}s, Process interval: {process_interval}s")

    processor = FaceitProcessor(demo_dir=demo_dir)

    last_poll_time = 0
    last_process_time = 0

    try:
        while True:
            current_time = time.time()

            # Poll for new matches
            if current_time - last_poll_time >= poll_interval:
                logger.info("Polling for new Faceit matches...")
                try:
                    new_count = processor.poll_for_new_matches()
                    logger.info(f"Queued {new_count} new matches")
                except Exception as e:
                    logger.error(f"Error polling for new matches: {e}")
                last_poll_time = current_time

            # Process pending matches
            if current_time - last_process_time >= process_interval:
                logger.info("Processing pending matches...")
                try:
                    success_count = processor.process_pending_matches(limit=5)
                    logger.info(f"Processed {success_count} matches")

                    # Also retry failed matches
                    retry_count = processor.process_retryable_matches(max_retries=3)
                    if retry_count > 0:
                        logger.info(f"Successfully retried {retry_count} matches")
                except Exception as e:
                    logger.error(f"Error processing matches: {e}")
                last_process_time = current_time

            # Sleep briefly between checks
            time.sleep(5)

    except KeyboardInterrupt:
        logger.info("Shutting down Faceit processor daemon")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Faceit match processor daemon')
    parser.add_argument('--poll-interval', type=int, default=60,
                        help='Seconds between polling for new matches (default: 60)')
    parser.add_argument('--process-interval', type=int, default=30,
                        help='Seconds between processing queue (default: 30)')
    parser.add_argument('--demo-dir', type=str, default='demos/faceit',
                        help='Directory for downloaded demos (default: demos/faceit)')
    parser.add_argument('--once', action='store_true',
                        help='Run once and exit (no daemon mode)')

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    if args.once:
        # Run once mode - useful for testing
        processor = FaceitProcessor(demo_dir=args.demo_dir)

        print("Polling for new matches...")
        new_count = processor.poll_for_new_matches()
        print(f"Queued {new_count} new matches")

        print("Processing pending matches...")
        success_count = processor.process_pending_matches()
        print(f"Processed {success_count} matches")

        print("Retrying failed matches...")
        retry_count = processor.process_retryable_matches()
        print(f"Retried {retry_count} matches")
    else:
        run_processor_daemon(
            poll_interval=args.poll_interval,
            process_interval=args.process_interval,
            demo_dir=args.demo_dir
        )
