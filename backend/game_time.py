"""
Game Time Utilities
==================

This module provides time-related utilities for the game universe,
including game time management and timestamp handling.
"""

import time
from datetime import datetime
from typing import Optional


def get_game_time() -> str:
    """
    Get current game time as ISO format string.

    For now, this uses real time, but can be extended to use
    game-specific time scaling in the future.

    Returns:
        str: Current time in ISO format
    """
    return datetime.utcnow().isoformat()


class GameTime:
    """
    Game time management class.

    Provides utilities for tracking game time, which can be
    extended to support time scaling, pausing, etc.
    """

    def __init__(self):
        """Initialize game time tracking."""
        self.start_time = time.time()
        self._paused = False
        self._pause_start = 0
        self._total_pause_time = 0

    def current(self) -> str:
        """
        Get current game time as ISO string.

        Returns:
            str: Current game time
        """
        return get_game_time()

    def elapsed(self) -> float:
        """
        Get elapsed game time in seconds.

        Returns:
            float: Seconds since game time started
        """
        if self._paused:
            return self._pause_start - self.start_time - self._total_pause_time
        else:
            return time.time() - self.start_time - self._total_pause_time

    def pause(self) -> None:
        """Pause game time."""
        if not self._paused:
            self._paused = True
            self._pause_start = time.time()

    def resume(self) -> None:
        """Resume game time."""
        if self._paused:
            self._paused = False
            self._total_pause_time += time.time() - self._pause_start

    def is_paused(self) -> bool:
        """
        Check if game time is paused.

        Returns:
            bool: True if paused, False otherwise
        """
        return self._paused

    def reset(self) -> None:
        """Reset game time tracking."""
        self.start_time = time.time()
        self._paused = False
        self._pause_start = 0
        self._total_pause_time = 0


def format_timestamp(timestamp: str) -> str:
    """
    Format ISO timestamp for display.

    Args:
        timestamp (str): ISO timestamp string

    Returns:
        str: Formatted timestamp
    """
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S UTC')
    except Exception:
        return timestamp


def get_time_diff(start_time: str, end_time: Optional[str] = None) -> float:
    """
    Get time difference in seconds between two timestamps.

    Args:
        start_time (str): Start timestamp (ISO format)
        end_time (str, optional): End timestamp. If None, uses current time.

    Returns:
        float: Time difference in seconds
    """
    try:
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00')) if end_time else datetime.utcnow()

        return (end_dt - start_dt).total_seconds()
    except Exception:
        return 0.0
