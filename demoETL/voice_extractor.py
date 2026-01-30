"""
Voice Extractor Module
======================
Wrapper for csgo-voice-extractor to extract player voice communications
from CS2 demo files.

Requirements:
    - csgo-voice-extractor binary must be installed and in PATH
    - Install via: https://github.com/akiver/csgo-voice-extractor

Note: Voice extraction only works with server-recorded demos that include
voice data. Valve Matchmaking demos do NOT contain voice audio.

Usage:
    from voice_extractor import VoiceExtractor

    extractor = VoiceExtractor()
    result = extractor.extract("match.dem", output_dir="./voice_output")
    if result.success:
        print(f"Extracted {len(result.files)} voice files")
"""

import os
import subprocess
import logging as logger
from dataclasses import dataclass
from typing import List, Optional
from pathlib import Path


@dataclass
class VoiceExtractionResult:
    """Result of voice extraction."""
    success: bool
    demo_path: str
    output_dir: str
    files: List[str]  # List of extracted WAV file paths
    error: Optional[str] = None
    has_voice_data: bool = True


class VoiceExtractor:
    """
    Wrapper for csgo-voice-extractor CLI tool.

    Modes:
        - split_compact: Separate WAV per player (concatenated segments)
        - split_full: Separate WAV per player (full demo length with silence)
        - single_full: All players merged into one WAV
    """

    BINARY_NAME = "csgo-voice-extractor"

    def __init__(self, binary_path: Optional[str] = None):
        """
        Initialize the voice extractor.

        Args:
            binary_path: Path to csgo-voice-extractor binary.
                         If None, assumes it's in PATH.
        """
        self.binary_path = binary_path or self.BINARY_NAME
        self._check_binary()

    def _check_binary(self) -> bool:
        """Check if the voice extractor binary is available."""
        try:
            result = subprocess.run(
                [self.binary_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                logger.info(f"Voice extractor available: {result.stdout.strip()}")
                return True
        except FileNotFoundError:
            logger.warning(
                f"Voice extractor binary '{self.binary_path}' not found. "
                "Install from: https://github.com/akiver/csgo-voice-extractor"
            )
        except subprocess.TimeoutExpired:
            logger.warning("Voice extractor binary check timed out")
        except Exception as e:
            logger.warning(f"Error checking voice extractor: {e}")

        return False

    def is_available(self) -> bool:
        """Check if voice extraction is available."""
        return self._check_binary()

    def extract(
        self,
        demo_path: str,
        output_dir: str,
        mode: str = "split_compact"
    ) -> VoiceExtractionResult:
        """
        Extract voice data from a demo file.

        Args:
            demo_path: Path to the .dem file
            output_dir: Directory to write WAV files to
            mode: Extraction mode:
                  - "split_compact": Per-player WAVs (default)
                  - "split_full": Per-player WAVs with original timing
                  - "single_full": All players merged

        Returns:
            VoiceExtractionResult with extraction details
        """
        demo_path = os.path.abspath(demo_path)
        output_dir = os.path.abspath(output_dir)

        # Validate demo exists
        if not os.path.exists(demo_path):
            return VoiceExtractionResult(
                success=False,
                demo_path=demo_path,
                output_dir=output_dir,
                files=[],
                error=f"Demo file not found: {demo_path}"
            )

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        # Map mode to CLI argument
        mode_args = {
            "split_compact": ["-m", "split-compact"],
            "split_full": ["-m", "split-full"],
            "single_full": ["-m", "single-full"],
        }

        if mode not in mode_args:
            return VoiceExtractionResult(
                success=False,
                demo_path=demo_path,
                output_dir=output_dir,
                files=[],
                error=f"Invalid mode: {mode}. Use: {list(mode_args.keys())}"
            )

        # Build command
        cmd = [
            self.binary_path,
            "-d", demo_path,
            "-o", output_dir,
            *mode_args[mode]
        ]

        logger.info(f"Running voice extraction: {' '.join(cmd)}")

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            # Check for "no voice data" in output
            if "no voice data" in result.stdout.lower() or "no voice data" in result.stderr.lower():
                logger.info(f"No voice data in demo: {demo_path}")
                return VoiceExtractionResult(
                    success=True,
                    demo_path=demo_path,
                    output_dir=output_dir,
                    files=[],
                    has_voice_data=False
                )

            if result.returncode != 0:
                return VoiceExtractionResult(
                    success=False,
                    demo_path=demo_path,
                    output_dir=output_dir,
                    files=[],
                    error=f"Extraction failed: {result.stderr}"
                )

            # Find extracted WAV files
            wav_files = list(Path(output_dir).glob("*.wav"))
            file_paths = [str(f) for f in wav_files]

            logger.info(f"Extracted {len(file_paths)} voice files from {demo_path}")

            return VoiceExtractionResult(
                success=True,
                demo_path=demo_path,
                output_dir=output_dir,
                files=file_paths,
                has_voice_data=len(file_paths) > 0
            )

        except subprocess.TimeoutExpired:
            return VoiceExtractionResult(
                success=False,
                demo_path=demo_path,
                output_dir=output_dir,
                files=[],
                error="Voice extraction timed out (>5 minutes)"
            )
        except Exception as e:
            return VoiceExtractionResult(
                success=False,
                demo_path=demo_path,
                output_dir=output_dir,
                files=[],
                error=f"Voice extraction error: {str(e)}"
            )


def extract_voice_from_demo(
    demo_path: str,
    output_dir: Optional[str] = None,
    mode: str = "split_compact"
) -> VoiceExtractionResult:
    """
    Convenience function to extract voice from a demo.

    Args:
        demo_path: Path to the .dem file
        output_dir: Directory for WAV output (default: same dir as demo)
        mode: Extraction mode (split_compact, split_full, single_full)

    Returns:
        VoiceExtractionResult
    """
    if output_dir is None:
        demo_dir = os.path.dirname(os.path.abspath(demo_path))
        demo_name = os.path.splitext(os.path.basename(demo_path))[0]
        output_dir = os.path.join(demo_dir, f"{demo_name}_voice")

    extractor = VoiceExtractor()

    if not extractor.is_available():
        return VoiceExtractionResult(
            success=False,
            demo_path=demo_path,
            output_dir=output_dir,
            files=[],
            error="csgo-voice-extractor not installed"
        )

    return extractor.extract(demo_path, output_dir, mode)


if __name__ == "__main__":
    # Test with example demo
    import sys

    demo = sys.argv[1] if len(sys.argv) > 1 else "../demos/example_premier.dem"

    print(f"Testing voice extraction on: {demo}")

    result = extract_voice_from_demo(demo)

    print(f"Success: {result.success}")
    print(f"Has voice data: {result.has_voice_data}")
    print(f"Files: {result.files}")
    if result.error:
        print(f"Error: {result.error}")
