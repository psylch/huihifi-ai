import logging
import sqlite3
from contextlib import contextmanager
from datetime import date
from typing import Iterator, Optional

logger = logging.getLogger(__name__)


class UsageRepository:
    """Persist and query per-user usage limits."""

    def __init__(self, database_path: str, daily_limit: int) -> None:
        self._database_path = database_path
        self.daily_limit = daily_limit

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self._database_path)
        try:
            yield conn
        finally:
            conn.close()

    def init_database(self) -> None:
        """Ensure required tables exist."""
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS user_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_token TEXT NOT NULL,
                    usage_date DATE NOT NULL,
                    usage_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_token, usage_date)
                )
                """
            )
            conn.commit()
        logger.info("数据库初始化完成")

    def get_usage(self, user_token: str) -> int:
        """Return the number of times the user has interacted today."""
        today = date.today()
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT usage_count FROM user_usage WHERE user_token = ? AND usage_date = ?",
                (user_token, today),
            )
            row = cursor.fetchone()
        return int(row[0]) if row else 0

    def increment_usage(self, user_token: str) -> bool:
        """
        Increase usage count for a user.

        Returns False if the user has already exhausted the daily limit.
        """
        today = date.today()
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT usage_count FROM user_usage WHERE user_token = ? AND usage_date = ?",
                (user_token, today),
            )
            result = cursor.fetchone()
            current_count = int(result[0]) if result else 0

            if current_count >= self.daily_limit:
                return False

            cursor.execute(
                """
                INSERT OR REPLACE INTO user_usage (user_token, usage_date, usage_count, updated_at)
                VALUES (
                    ?,
                    ?,
                    COALESCE(
                        (SELECT usage_count FROM user_usage WHERE user_token = ? AND usage_date = ?),
                        0
                    ) + 1,
                    CURRENT_TIMESTAMP
                )
                """,
                (user_token, today, user_token, today),
            )
            conn.commit()
            return True

    def remaining_quota(self, user_token: str) -> int:
        usage = self.get_usage(user_token)
        remaining = self.daily_limit - usage
        return remaining if remaining > 0 else 0
