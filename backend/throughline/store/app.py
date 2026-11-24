from __future__ import annotations

import secrets
import sqlite3
import threading
from datetime import UTC, datetime
from pathlib import Path

from throughline.plan.models import Plan
from throughline.review.assemble import EntryState, ReviewBody

SCHEMA = """
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, edit_token TEXT NOT NULL, created_at TEXT NOT NULL, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, edit_token TEXT NOT NULL, created_at TEXT NOT NULL, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS entries (
  review_id TEXT NOT NULL, entry_id TEXT NOT NULL, status TEXT, note TEXT NOT NULL,
  PRIMARY KEY (review_id, entry_id));
"""


class AppStore:
    """The app's own records. One connection, guarded by a lock."""

    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._con = sqlite3.connect(str(path), check_same_thread=False)
        self._lock = threading.Lock()
        with self._lock:
            self._con.executescript(SCHEMA)

    @staticmethod
    def _new_id() -> str:
        return secrets.token_urlsafe(9)

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).isoformat()

    def create_plan(self, plan: Plan) -> tuple[str, str]:
        plan_id, token = self._new_id(), secrets.token_urlsafe(18)
        with self._lock, self._con:
            self._con.execute(
                "INSERT INTO plans VALUES (?, ?, ?, ?)", (plan_id, token, self._now(), plan.model_dump_json())
            )
        return plan_id, token

    def get_plan(self, plan_id: str) -> Plan | None:
        with self._lock:
            row = self._con.execute("SELECT body FROM plans WHERE id = ?", (plan_id,)).fetchone()
        return Plan.model_validate_json(row[0]) if row else None

    def update_plan(self, plan_id: str, token: str, plan: Plan) -> bool:
        with self._lock, self._con:
            cursor = self._con.execute(
                "UPDATE plans SET body = ? WHERE id = ? AND edit_token = ?",
                (plan.model_dump_json(), plan_id, token),
            )
        return cursor.rowcount == 1

    def create_review(self, body: ReviewBody) -> tuple[str, str]:
        review_id, token = self._new_id(), secrets.token_urlsafe(18)
        with self._lock, self._con:
            self._con.execute(
                "INSERT INTO reviews VALUES (?, ?, ?, ?)",
                (review_id, token, self._now(), body.model_dump_json()),
            )
        return review_id, token

    def get_review(self, review_id: str) -> ReviewBody | None:
        with self._lock:
            row = self._con.execute("SELECT body FROM reviews WHERE id = ?", (review_id,)).fetchone()
        return ReviewBody.model_validate_json(row[0]) if row else None

    def set_entry(self, review_id: str, token: str, entry_id: str, state: EntryState) -> bool:
        with self._lock, self._con:
            ok = self._con.execute(
                "SELECT 1 FROM reviews WHERE id = ? AND edit_token = ?", (review_id, token)
            ).fetchone()
            if not ok:
                return False
            self._con.execute(
                "INSERT INTO entries VALUES (?, ?, ?, ?) "
                "ON CONFLICT (review_id, entry_id) "
                "DO UPDATE SET status = excluded.status, note = excluded.note",
                (review_id, entry_id, state.status, state.note),
            )
        return True

    def entries(self, review_id: str) -> dict[str, EntryState]:
        with self._lock:
            rows = self._con.execute(
                "SELECT entry_id, status, note FROM entries WHERE review_id = ?", (review_id,)
            ).fetchall()
        return {entry_id: EntryState(status=status, note=note) for entry_id, status, note in rows}
